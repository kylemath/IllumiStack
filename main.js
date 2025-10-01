p5.disableFriendlyErrors = true; //small performance boost
let img, copy, layer, layers, subd;
let color1Picker, color2Picker, color3Picker;
let totalLayersSlider;
let recomputeButton;
let transition1Slider, transition1SliderValue;
let transition2Slider, transition2SliderValue;
let transition3Slider, transition3SliderValue;
let colorToggle;

// Two separate canvases
let originalCanvas, modifiedCanvas;

// Three.js variables for 3D visualization
let scene, camera, renderer, mesh, controls;
let generateSTLButton, downloadSTLButton;
let meshData = null;
let modelDimensionsInput, layerHeightInput, baseLayersInput, compensateFirstLayerCheckbox;

// Display size variables
let outputWidthInput, outputHeightInput, lockAspectCheckbox;
let displayScale = 1;
let maxDisplayWidth = 800;  // Max pixels for display
let maxDisplayHeight = 400;

function preload() {
  let name = "fd.png";
  img = loadImage(name);
  copy = loadImage(name);
}

function setup() {
  // Calculate initial display size
  calculateDisplaySize();
  
  // Create two separate canvases
  originalCanvas = createCanvas(400, 400);
  originalCanvas.parent('original-container');
  
  modifiedCanvas = createGraphics(400, 400);

  // File input - styled and moved to sidebar
  input = createFileInput(handleFile);
  input.parent('file-input-container');
  input.class('file-input-styled');
  
  // Style the p5 file input to match our design
  input.style('width', '100%');
  input.style('padding', '10px');
  input.style('background', 'rgba(255, 255, 255, 0.05)');
  input.style('border', '2px dashed rgba(255, 255, 255, 0.2)');
  input.style('border-radius', '8px');
  input.style('color', '#e4e4e7');
  input.style('cursor', 'pointer');
  input.style('font-size', '13px');
  input.style('font-weight', '500');

  // Color pickers (already in HTML)
  color1Picker = select("#color1");
  color2Picker = select("#color2");
  color3Picker = select("#color3");

  // Display size inputs
  outputWidthInput = select('#output-width');
  outputHeightInput = select('#output-height');
  lockAspectCheckbox = select('#lock-aspect');
  
  // Update display when output size changes
  outputWidthInput.input(() => {
    if (lockAspectCheckbox.checked() && img) {
      const aspectRatio = img.width / img.height;
      outputHeightInput.value(Math.round(parseFloat(outputWidthInput.value()) / aspectRatio));
    }
    updateCanvasSize();
  });
  
  outputHeightInput.input(() => {
    if (lockAspectCheckbox.checked() && img) {
      const aspectRatio = img.width / img.height;
      outputWidthInput.value(Math.round(parseFloat(outputHeightInput.value()) * aspectRatio));
    }
    updateCanvasSize();
  });

  // Total layer slider - move to sidebar
  totalLayersSlider = createSlider(1, 100, 15);
  totalLayersSlider.parent('total-layers-slider');
  totalLayersSlider.input(() => {
    select('#total-layers-value').html(totalLayersSlider.value());
    subd = parseInt(range / totalLayersSlider.value());
    updateTransitionSlidersMax();
  });

  // Recompute button - use HTML button
  recomputeButton = select('#recompute-btn-sidebar');
  recomputeButton.mousePressed(recomputeImage);

  // Color toggle - move to sidebar
  colorToggle = createCheckbox("Use three colors", false);
  colorToggle.parent('color-toggle-container');
  colorToggle.changed(toggleColors);

  // Transition Sliders - move to sidebar
  let layers = totalLayersSlider.value();
  
  transition1Slider = createSlider(1, layers, 3);
  transition1Slider.parent('transition1-slider');
  transition1Slider.input(() => {
    select('#transition1-value').html(transition1Slider.value());
  });

  transition2Slider = createSlider(1, layers, 6);
  transition2Slider.parent('transition2-slider');
  transition2Slider.input(() => {
    select('#transition2-value').html(transition2Slider.value());
  });

  transition3Slider = createSlider(1, layers, 9);
  transition3Slider.parent('transition3-slider');
  transition3Slider.input(() => {
    select('#transition3-value').html(transition3Slider.value());
  });

  // 3D buttons - use HTML buttons
  generateSTLButton = select('#generate-mesh-btn');
  generateSTLButton.mousePressed(generate3DMesh);

  downloadSTLButton = select('#download-stl-btn');
  downloadSTLButton.mousePressed(downloadSTL);

  // Model dimensions - use HTML inputs
  modelDimensionsInput = select('#model-width');
  layerHeightInput = select('#layer-height');
  baseLayersInput = select('#base-layers');
  compensateFirstLayerCheckbox = select('#compensate-first-layer');

  // Initialize Three.js scene
  initThreeJS();
  
  // Handle window resize
  window.addEventListener('resize', () => {
    calculateDisplaySize();
    updateCanvasSize();
  });
  
  // Create a second canvas element for modified image
  const modifiedCanvasElement = document.createElement('canvas');
  modifiedCanvasElement.width = 400;
  modifiedCanvasElement.height = 400;
  document.getElementById('modified-container').appendChild(modifiedCanvasElement);
}

function updateTransitionSlidersMax() {
  let layers = totalLayersSlider.value();
  transition1Slider.elt.max = layers;
  transition2Slider.elt.max = layers;
  transition3Slider.elt.max = layers;
}

function imageReady() {
  layer = 1;

  use_gray = true; // WIP for working with hue threshold
  range = use_gray ? 255 : 360; // rgb vs hue ranges
  factor = 1; // scaling factor for images, use 2 or more if it takes too long
  layers = 15; // stl model layers
  layer = 1;
  base_color = "black";

  subd = parseInt(range / layers);
  
  // Update output dimensions to match image aspect ratio if locked
  if (lockAspectCheckbox && lockAspectCheckbox.checked()) {
    const aspectRatio = img.width / img.height;
    outputHeightInput.value(Math.round(parseFloat(outputWidthInput.value()) / aspectRatio));
  }
  
  img.resize(img.width / factor, img.height / factor);
  copy.resize(copy.width / factor, copy.height / factor);
  img.loadPixels();
  copy.loadPixels();
  
  updateCanvasSize();
}

function toggleColors() {
  if (colorToggle.checked()) {
    // Checkbox is checked, show the fourth slider
    transition3Slider.show();
    transition3SliderValue.show();
  } else {
    // Checkbox is unchecked, hide the fourth slider
    transition3Slider.hide();
    transition3SliderValue.hide();
  }
}

function handleFile(file) {
  if (file.type === "image") {
    img = loadImage(file.data, imageReady);
    copy = loadImage(file.data, imageReady);
  } else {
    img = null;
    copy = null;
  }
}
function recomputeImage() {
  // Reset the layer variable to 1
  layer = 1;
}

function calculateDisplaySize() {
  // Calculate max display size based on the view-content containers
  const viewContent = document.querySelector('.view-content');
  if (viewContent) {
    // Get the actual available space minus padding
    maxDisplayWidth = viewContent.clientWidth - 32; // Account for padding
    maxDisplayHeight = viewContent.clientHeight - 32;
    
    // Ensure minimum sizes
    maxDisplayWidth = Math.max(maxDisplayWidth, 300);
    maxDisplayHeight = Math.max(maxDisplayHeight, 200);
  }
}

function updateCanvasSize() {
  if (!img) return;
  
  // Calculate display size for each canvas
  const aspectRatio = img.width / img.height;
  let displayWidth, displayHeight;
  
  // Fit within max display constraints
  if (img.width > img.height) {
    displayWidth = Math.min(img.width, maxDisplayWidth);
    displayHeight = displayWidth / aspectRatio;
    if (displayHeight > maxDisplayHeight) {
      displayHeight = maxDisplayHeight;
      displayWidth = displayHeight * aspectRatio;
    }
  } else {
    displayHeight = Math.min(img.height, maxDisplayHeight);
    displayWidth = displayHeight * aspectRatio;
    if (displayWidth > maxDisplayWidth) {
      displayWidth = maxDisplayWidth;
      displayHeight = displayWidth / aspectRatio;
    }
  }
  
  // Resize both canvases to the same size
  resizeCanvas(displayWidth, displayHeight);
  modifiedCanvas.resizeCanvas(displayWidth, displayHeight);
  
  // Also update the DOM element for modified canvas
  const modifiedCanvasElement = document.querySelector('#modified-container canvas');
  if (modifiedCanvasElement) {
    modifiedCanvasElement.width = displayWidth;
    modifiedCanvasElement.height = displayHeight;
  }
  
  displayScale = displayWidth / img.width;
}

function draw() {
  // Draw original image on the original canvas
  background(0);
  if (img) {
    const imgAspect = img.width / img.height;
    const canvasAspect = width / height;
    let displayWidth, displayHeight;
    
    if (imgAspect > canvasAspect) {
      displayWidth = width;
      displayHeight = width / imgAspect;
    } else {
      displayHeight = height;
      displayWidth = height * imgAspect;
    }
    image(img, (width - displayWidth) / 2, (height - displayHeight) / 2, displayWidth, displayHeight);
  }
  
  // Draw modified image on the modified canvas
  const modifiedCanvasElement = document.querySelector('#modified-container canvas');
  if (modifiedCanvasElement && copy) {
    const ctx = modifiedCanvasElement.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, modifiedCanvasElement.width, modifiedCanvasElement.height);
    
    // Draw the copy image scaled to fit
    const imgAspect = copy.width / copy.height;
    const canvasAspect = modifiedCanvasElement.width / modifiedCanvasElement.height;
    let displayWidth, displayHeight, x, y;
    
    if (imgAspect > canvasAspect) {
      displayWidth = modifiedCanvasElement.width;
      displayHeight = modifiedCanvasElement.width / imgAspect;
      x = 0;
      y = (modifiedCanvasElement.height - displayHeight) / 2;
    } else {
      displayHeight = modifiedCanvasElement.height;
      displayWidth = modifiedCanvasElement.height * imgAspect;
      x = (modifiedCanvasElement.width - displayWidth) / 2;
      y = 0;
    }
    
    ctx.drawImage(copy.canvas, x, y, displayWidth, displayHeight);
  }

  let color1 = color1Picker.value();
  let color2 = color2Picker.value();
  let color3 = color3Picker.value(); // New color

  let layers = totalLayersSlider.value();
  // Get the values of the sliders
  let transition1 = transition1Slider.value();
  let transition2 = transition2Slider.value();
  let transition3 = transition3Slider.value();

  if (layer <= layers) {
    let thresh = parseInt(subd * (layer - 1)); // threshold to change pixels
    for (i = 0; i < copy.pixels.length; i += 4) {
      if (img.pixels[i + 3] == 0) continue; // skip on transparent pixels for png files

      if (layer == 1) {
        // the origin color for the color mix. After the first layer, it is the current image's color
        orig_color = color(base_color);
      } else {
        orig_color = color(
          copy.pixels[i],
          copy.pixels[i + 1],
          copy.pixels[i + 2]
        );
      }

      if (use_gray) {
        current_value =
          (img.pixels[i] + img.pixels[i + 1] + img.pixels[i + 2]) / 3;
      } else {
        let c = color(img.pixels[i], img.pixels[i + 1], img.pixels[i + 2]);
        current_value = hue(c);
      }

      if (current_value >= thresh) {
        let mixFactor = 0.3; // Variable for mix factor

        // use this switch-case to setup your layer changes. Add or remove layers and set mix-factor as you wish
        if (colorToggle.checked()) {
          // Checkbox is checked, use three colors
          switch (true) {
            case layer <= 1:
              current_color = [base_color, mixFactor];
              break;
            case layer <= transition1:
              current_color = [color1, mixFactor];
              break;
            case layer <= transition2:
              current_color = [color2, mixFactor];
              break;
            case layer <= transition3:
              current_color = [color3, mixFactor]; // New color
              break;
            case layer <= layers:
              current_color = ["white", mixFactor];
              break;
          }
        } else {
          // Checkbox is unchecked, use two colors
          switch (true) {
            case layer <= 1:
              current_color = [base_color, 0.5];
              break;
            case layer <= transition1:
              current_color = [color1, 0.5];
              break;
            case layer <= transition2:
              current_color = [color2, 0.2];
              break;
            case layer <= layers:
              current_color = ["white", 0.5];
              break;
          }
        }
        color_layer(current_color);
      }
    }

    console.log("Layer " + layer + ", with " + current_color);
    copy.updatePixels();
    
    // Redraw modified canvas with updated image
    const modifiedCanvasElement = document.querySelector('#modified-container canvas');
    if (modifiedCanvasElement) {
      const ctx = modifiedCanvasElement.getContext('2d');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, modifiedCanvasElement.width, modifiedCanvasElement.height);
      
      const imgAspect = copy.width / copy.height;
      const canvasAspect = modifiedCanvasElement.width / modifiedCanvasElement.height;
      let displayWidth, displayHeight, x, y;
      
      if (imgAspect > canvasAspect) {
        displayWidth = modifiedCanvasElement.width;
        displayHeight = modifiedCanvasElement.width / imgAspect;
        x = 0;
        y = (modifiedCanvasElement.height - displayHeight) / 2;
      } else {
        displayHeight = modifiedCanvasElement.height;
        displayWidth = modifiedCanvasElement.height * imgAspect;
        x = (modifiedCanvasElement.width - displayWidth) / 2;
        y = 0;
      }
      
      ctx.drawImage(copy.canvas, x, y, displayWidth, displayHeight);
    }
    
    layer++;
  }
}

function color_layer(c_color) {
  dest_color = color(c_color[0]);
  result = mixbox.lerp(orig_color.levels, dest_color.levels, c_color[1]); // color mix using mixbox for accurate pigment mixing results
  copy.pixels[i + 0] = result[0];
  copy.pixels[i + 1] = result[1];
  copy.pixels[i + 2] = result[2];
}

// ========== 3D VISUALIZATION AND STL GENERATION ==========

function initThreeJS() {
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);

  // Get container size
  const container = document.getElementById("three-container");
  const viewWidth = Math.min(container.clientWidth - 32, maxDisplayWidth);
  const viewHeight = Math.min(container.clientHeight - 32, maxDisplayHeight);
  
  camera = new THREE.PerspectiveCamera(
    75,
    viewWidth / viewHeight,
    0.1,
    1000
  );
  camera.position.set(0, 50, 100);

  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(viewWidth, viewHeight);
  
  container.appendChild(renderer.domElement);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x404040, 2);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // Add orbit controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Add grid helper
  const gridHelper = new THREE.GridHelper(200, 20);
  scene.add(gridHelper);

  // Handle window resize
  window.addEventListener("resize", () => {
    const container = document.getElementById("three-container");
    if (container && renderer) {
      const newWidth = Math.min(container.clientWidth - 32, maxDisplayWidth);
      const newHeight = Math.min(container.clientHeight - 32, maxDisplayHeight);
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    }
  });
}

function animate3D() {
  requestAnimationFrame(animate3D);
  controls.update();
  renderer.render(scene, camera);
}

function generate3DMesh() {
  console.log("Generating 3D mesh from image...");

  // Wait for image processing to complete
  if (layer <= totalLayersSlider.value()) {
    alert("Please wait for image processing to complete before generating 3D mesh.");
    return;
  }

  copy.loadPixels();

  const modelWidth = parseFloat(modelDimensionsInput.value());
  const layerHeight = parseFloat(layerHeightInput.value());
  const numLayers = totalLayersSlider.value();
  const baseLayers = parseInt(baseLayersInput.value());
  const compensateFirstLayer = compensateFirstLayerCheckbox.checked();

  // Calculate dimensions
  const width = copy.width;
  const height = copy.height;
  const aspectRatio = width / height;
  const modelHeight = modelWidth / aspectRatio;
  const reliefDepth = layerHeight * numLayers;
  const baseDepth = layerHeight * baseLayers;
  
  // Add extra height to compensate for thicker first layer (typically 2x normal height)
  const firstLayerCompensation = compensateFirstLayer ? layerHeight : 0;
  const modelDepth = reliefDepth + baseDepth + firstLayerCompensation; // Total model depth including base and compensation

  // Create height map from brightness
  const heightMap = [];
  for (let y = 0; y < height; y++) {
    heightMap[y] = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const brightness = (copy.pixels[idx] + copy.pixels[idx + 1] + copy.pixels[idx + 2]) / 3;
      // Map brightness (0-255) to height (0-reliefDepth), then offset by baseDepth + compensation
      const heightValue = (brightness / 255) * reliefDepth + baseDepth + firstLayerCompensation;
      heightMap[y][x] = heightValue;
    }
  }

  // Create geometry
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const indices = [];
  const colors = [];

  // Scale factors
  const scaleX = modelWidth / width;
  const scaleZ = modelHeight / height;

  // Generate TOP SURFACE vertices
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const posX = (x - width / 2) * scaleX;
      const posZ = (y - height / 2) * scaleZ;
      const posY = heightMap[y][x];

      vertices.push(posX, posY, posZ);

      // Add color from processed image
      const idx = (y * width + x) * 4;
      colors.push(
        copy.pixels[idx] / 255,
        copy.pixels[idx + 1] / 255,
        copy.pixels[idx + 2] / 255
      );
    }
  }

  // Generate top surface indices
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const a = y * width + x;
      const b = y * width + (x + 1);
      const c = (y + 1) * width + x;
      const d = (y + 1) * width + (x + 1);

      // Two triangles per quad
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  // Store starting index for bottom vertices
  const bottomVertexStart = vertices.length / 3;

  // Generate BOTTOM SURFACE vertices (flat at Y = 0, which is base layers below relief)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const posX = (x - width / 2) * scaleX;
      const posZ = (y - height / 2) * scaleZ;
      const posY = 0; // Flat bottom at base level

      vertices.push(posX, posY, posZ);

      // Same colors as top
      const idx = (y * width + x) * 4;
      colors.push(
        copy.pixels[idx] / 255,
        copy.pixels[idx + 1] / 255,
        copy.pixels[idx + 2] / 255
      );
    }
  }

  // Generate bottom surface indices (reverse winding for correct normals)
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const a = bottomVertexStart + y * width + x;
      const b = bottomVertexStart + y * width + (x + 1);
      const c = bottomVertexStart + (y + 1) * width + x;
      const d = bottomVertexStart + (y + 1) * width + (x + 1);

      // Two triangles per quad (reversed winding)
      indices.push(a, d, b);
      indices.push(a, c, d);
    }
  }

  // Generate WALLS connecting top and bottom edges

  // Front wall (y = 0)
  for (let x = 0; x < width - 1; x++) {
    const topLeft = x;
    const topRight = x + 1;
    const bottomLeft = bottomVertexStart + x;
    const bottomRight = bottomVertexStart + x + 1;

    indices.push(topLeft, bottomLeft, bottomRight);
    indices.push(topLeft, bottomRight, topRight);
  }

  // Back wall (y = height - 1)
  for (let x = 0; x < width - 1; x++) {
    const topLeft = (height - 1) * width + x;
    const topRight = (height - 1) * width + x + 1;
    const bottomLeft = bottomVertexStart + (height - 1) * width + x;
    const bottomRight = bottomVertexStart + (height - 1) * width + x + 1;

    indices.push(topLeft, topRight, bottomRight);
    indices.push(topLeft, bottomRight, bottomLeft);
  }

  // Left wall (x = 0)
  for (let y = 0; y < height - 1; y++) {
    const topFront = y * width;
    const topBack = (y + 1) * width;
    const bottomFront = bottomVertexStart + y * width;
    const bottomBack = bottomVertexStart + (y + 1) * width;

    indices.push(topFront, topBack, bottomBack);
    indices.push(topFront, bottomBack, bottomFront);
  }

  // Right wall (x = width - 1)
  for (let y = 0; y < height - 1; y++) {
    const topFront = y * width + (width - 1);
    const topBack = (y + 1) * width + (width - 1);
    const bottomFront = bottomVertexStart + y * width + (width - 1);
    const bottomBack = bottomVertexStart + (y + 1) * width + (width - 1);

    indices.push(topFront, bottomFront, bottomBack);
    indices.push(topFront, bottomBack, topBack);
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  // Store mesh data for STL export
  meshData = {
    vertices: vertices,
    indices: indices,
    width: modelWidth,
    height: modelHeight,
    depth: modelDepth,
  };

  // Remove old mesh if exists
  if (mesh) {
    scene.remove(mesh);
  }

  // Create material with vertex colors
  const material = new THREE.MeshPhongMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    shininess: 30,
  });

  // Create mesh
  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Enable download button
  downloadSTLButton.elt.removeAttribute("disabled");

  const compensationNote = compensateFirstLayer ? ' + 1 layer compensation' : '';
  console.log(
    `Closed 3D mesh generated: ${vertices.length / 3} vertices, ${indices.length / 3} triangles, ${modelWidth}x${modelHeight}x${modelDepth.toFixed(2)}mm (${baseLayers} base + ${numLayers} relief${compensationNote})`
  );
  
  // Clear placeholder text and start animation
  const threeContainer = document.getElementById('three-container');
  const placeholder = threeContainer.querySelector('p');
  if (placeholder) {
    placeholder.remove();
  }
  
  // Display layer information
  displayLayerInfo(baseLayers, numLayers, layerHeight, compensateFirstLayer);
  
  // Start 3D animation
  animate3D();
}

function displayLayerInfo(baseLayers, numLayers, layerHeight, compensateFirstLayer) {
  const layerInfoDiv = document.getElementById('layer-info');
  const layerInfoContent = document.getElementById('layer-info-content');
  
  // Get current color settings
  const color1 = color1Picker.value();
  const color2 = color2Picker.value();
  const color3 = color3Picker.value();
  const useThreeColors = colorToggle.checked();
  
  // Get transition points
  const transition1 = transition1Slider.value();
  const transition2 = transition2Slider.value();
  const transition3 = transition3Slider.value();
  
  let layerInfo = '';
  
  // Base layers (black)
  const baseHeight = (baseLayers * layerHeight).toFixed(2);
  layerInfo += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
    <div style="width: 20px; height: 20px; background: black; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px;"></div>
    <span><strong>Layers 1-${baseLayers}:</strong> Black base (0.00mm - ${baseHeight}mm)</span>
  </div>`;
  
  // Relief layers with color transitions
  let currentLayer = baseLayers + 1;
  let currentHeight = baseLayers * layerHeight;
  
  if (useThreeColors) {
    // Three color mode
    
    // Color 1
    if (transition1 > 1) {
      const endLayer = baseLayers + transition1;
      const endHeight = (endLayer * layerHeight).toFixed(2);
      layerInfo += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <div style="width: 20px; height: 20px; background: ${color1}; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px;"></div>
        <span><strong>Layers ${currentLayer}-${endLayer}:</strong> Color 1 (${baseHeight}mm - ${endHeight}mm)</span>
      </div>`;
      currentLayer = endLayer + 1;
      currentHeight = endLayer * layerHeight;
    }
    
    // Color 2
    if (transition2 > transition1) {
      const endLayer = baseLayers + transition2;
      const startHeight = currentHeight.toFixed(2);
      const endHeight = (endLayer * layerHeight).toFixed(2);
      layerInfo += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <div style="width: 20px; height: 20px; background: ${color2}; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px;"></div>
        <span><strong>Layers ${currentLayer}-${endLayer}:</strong> Color 2 (${startHeight}mm - ${endHeight}mm)</span>
      </div>`;
      currentLayer = endLayer + 1;
      currentHeight = endLayer * layerHeight;
    }
    
    // Color 3
    if (transition3 > transition2) {
      const endLayer = baseLayers + transition3;
      const startHeight = currentHeight.toFixed(2);
      const endHeight = (endLayer * layerHeight).toFixed(2);
      layerInfo += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <div style="width: 20px; height: 20px; background: ${color3}; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px;"></div>
        <span><strong>Layers ${currentLayer}-${endLayer}:</strong> Color 3 (${startHeight}mm - ${endHeight}mm)</span>
      </div>`;
      currentLayer = endLayer + 1;
      currentHeight = endLayer * layerHeight;
    }
    
  } else {
    // Two color mode
    
    // Color 1
    if (transition1 > 1) {
      const endLayer = baseLayers + transition1;
      const endHeight = (endLayer * layerHeight).toFixed(2);
      layerInfo += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <div style="width: 20px; height: 20px; background: ${color1}; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px;"></div>
        <span><strong>Layers ${currentLayer}-${endLayer}:</strong> Color 1 (${baseHeight}mm - ${endHeight}mm)</span>
      </div>`;
      currentLayer = endLayer + 1;
      currentHeight = endLayer * layerHeight;
    }
    
    // Color 2
    if (transition2 > transition1) {
      const endLayer = baseLayers + transition2;
      const startHeight = currentHeight.toFixed(2);
      const endHeight = (endLayer * layerHeight).toFixed(2);
      layerInfo += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <div style="width: 20px; height: 20px; background: ${color2}; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px;"></div>
        <span><strong>Layers ${currentLayer}-${endLayer}:</strong> Color 2 (${startHeight}mm - ${endHeight}mm)</span>
      </div>`;
      currentLayer = endLayer + 1;
      currentHeight = endLayer * layerHeight;
    }
  }
  
  // White top layers
  if (currentLayer <= baseLayers + numLayers) {
    const endLayer = baseLayers + numLayers;
    const startHeight = currentHeight.toFixed(2);
    const endHeight = (endLayer * layerHeight).toFixed(2);
    layerInfo += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
      <div style="width: 20px; height: 20px; background: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px;"></div>
      <span><strong>Layers ${currentLayer}-${endLayer}:</strong> White top (${startHeight}mm - ${endHeight}mm)</span>
    </div>`;
  }
  
  // Add note about expected print layers
  const totalModelHeight = (baseLayers + numLayers) * layerHeight + (compensateFirstLayer ? layerHeight : 0);
  const expectedLayers = baseLayers + numLayers + (compensateFirstLayer ? 1 : 0);
  layerInfo += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 10px; color: #a1a1aa;">
    <strong>Model Height:</strong> ${totalModelHeight.toFixed(2)}mm<br>
    <strong>Expected Print Layers:</strong> ${expectedLayers} layers at ${layerHeight}mm layer height${compensateFirstLayer ? ' (includes first layer compensation)' : ''}
  </div>`;
  
  layerInfoContent.innerHTML = layerInfo;
  layerInfoDiv.style.display = 'block';
}

function downloadSTL() {
  if (!meshData) {
    alert("Please generate 3D mesh first!");
    return;
  }

  console.log("Generating binary STL file...");

  const { vertices, indices } = meshData;
  const numTriangles = indices.length / 3;
  
  // Binary STL format:
  // 80 byte header
  // 4 byte unsigned integer (number of triangles)
  // For each triangle:
  //   - 12 bytes (3 floats) for normal vector
  //   - 12 bytes (3 floats) for vertex 1
  //   - 12 bytes (3 floats) for vertex 2
  //   - 12 bytes (3 floats) for vertex 3
  //   - 2 bytes for attribute byte count (usually 0)
  // Total per triangle: 50 bytes
  
  const bufferSize = 80 + 4 + (numTriangles * 50);
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);
  
  // Write header (80 bytes)
  const headerText = "Binary STL generated by IllumiStack";
  for (let i = 0; i < Math.min(headerText.length, 80); i++) {
    view.setUint8(i, headerText.charCodeAt(i));
  }
  
  // Write number of triangles (4 bytes, little endian)
  view.setUint32(80, numTriangles, true);
  
  let offset = 84;
  
  // Write triangles
  for (let i = 0; i < indices.length; i += 3) {
    const i1 = indices[i] * 3;
    const i2 = indices[i + 1] * 3;
    const i3 = indices[i + 2] * 3;

    const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
    const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
    const v3 = [vertices[i3], vertices[i3 + 1], vertices[i3 + 2]];

    // Calculate normal
    const u = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
    const v = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
    const normal = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];

    // Normalize
    const length = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
    const nx = length > 0 ? normal[0] / length : 0;
    const ny = length > 0 ? normal[1] / length : 0;
    const nz = length > 0 ? normal[2] / length : 0;

    // Write normal (12 bytes)
    view.setFloat32(offset, nx, true); offset += 4;
    view.setFloat32(offset, ny, true); offset += 4;
    view.setFloat32(offset, nz, true); offset += 4;
    
    // Write vertex 1 (12 bytes)
    view.setFloat32(offset, v1[0], true); offset += 4;
    view.setFloat32(offset, v1[1], true); offset += 4;
    view.setFloat32(offset, v1[2], true); offset += 4;
    
    // Write vertex 2 (12 bytes)
    view.setFloat32(offset, v2[0], true); offset += 4;
    view.setFloat32(offset, v2[1], true); offset += 4;
    view.setFloat32(offset, v2[2], true); offset += 4;
    
    // Write vertex 3 (12 bytes)
    view.setFloat32(offset, v3[0], true); offset += 4;
    view.setFloat32(offset, v3[1], true); offset += 4;
    view.setFloat32(offset, v3[2], true); offset += 4;
    
    // Write attribute byte count (2 bytes) - usually 0
    view.setUint16(offset, 0, true); offset += 2;
  }

  // Download file
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "illumistack_model.stl";
  a.click();
  URL.revokeObjectURL(url);

  console.log(`Binary STL file downloaded! (${numTriangles.toLocaleString()} triangles, ${(bufferSize / 1024 / 1024).toFixed(2)} MB)`);
}
