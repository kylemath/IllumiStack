p5.disableFriendlyErrors = true; //small performance boost
let img, copy, layer, layers, subd;
let scene, camera, renderer;
let color1Picker, color2Picker, color3Picker;
let totalLayersSlider;
let recomputeButton;
let transition1Slider, transition1SliderValue;
let transition2Slider, transition2SliderValue;
let transition3Slider, transition3SliderValue;
let colorToggle;
let currentMesh = null; // Add this line at the top of your script
let baseSizeCm = 5;
let controls;

function preload() {
  let name = "logoTest_mini.png";
  img = loadImage(name);
  copy = loadImage(name);
}

function setup3d() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87cefa);
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.5,
    2000
  );

  var lithofunVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

  var lithofunFragmentShader = `
  uniform sampler2D theMap;
  varying vec2 vUv;

  void main() {
    float gray = texture2D(theMap, vUv).g;
    vec3 finalColor = vec3(1.0, 1.0, 1.0);
    gl_FragColor = vec4((1.0 - gray * 0.7) * finalColor, gray * 0.2 + 0.8);
  }
`;

  materialTranslucent = new THREE.ShaderMaterial({
    transparent: true,
    vertexShader: lithofunVertexShader,
    fragmentShader: lithofunFragmentShader,
    uniforms: {
      theMap: { value: null },
    },
  });

  camera.position.set(0, 120, 180);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor(0x000000); // Set background color to black
  renderer.setSize(800, 600);

  // Add event listener for keyboard events
  window.addEventListener("keydown", function (event) {
    switch (event.key) {
      case "w":
        // Zoom in
        camera.position.y -= 10;
        break;
      case "s":
        // Zoom out
        camera.position.y += 10;
        break;
      case "a":
        // Zoom in
        camera.position.z -= 10;
        break;
      case "d":
        // Zoom out
        camera.position.z += 10;
        break;
    }

    controls.update();
  });

  // Adding lighting
  var sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(30, 12, 63);
  scene.add(sun);

  var sun2 = new THREE.DirectionalLight(0xffffff, 1.0);
  sun2.position.set(-20, 25, -13);
  scene.add(sun2);

  var baseGeometry = new THREE.BoxGeometry(
    baseSizeCm * 10,
    10,
    baseSizeCm * 10
  );
  var texLoader = new THREE.TextureLoader();
  var baseTexture = texLoader.load("./grid.png");
  baseTexture.wrapS = THREE.RepeatWrapping;
  baseTexture.wrapT = THREE.RepeatWrapping;
  baseTexture.repeat.x = baseSizeCm;
  baseTexture.repeat.y = baseSizeCm;
  var baseMaterial = new THREE.MeshLambertMaterial({ map: baseTexture });
  var base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.y = -5;
  scene.add(base);

  // let pointLight = new THREE.PointLight(0xffffff, 1); // Increase brightness to 2
  // pointLight.position.set(0, 0, 10); // Set light position to be in front of the cube
  // pointLight.target = cube; // Set the light's direction towards the cube
  // scene.add(pointLight);

  // scene.add(cube);

  camera.position.z = 100; // Adjust this value if needed

  let container = document.getElementById("threejs-container");
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // controls = new OrbitControls(camera, renderer.domElement);

  animate(); // Start the animation loop
}

function setup() {
  setup3d();

  let canvas = createCanvas(200, 200); // Create a p5.js canvas
  canvas.parent("p5js-images"); // Append the canvas to the 'p5js-images' div

  input = createFileInput(handleFile);
  input.position(200, 5);

  titleString = createElement("h2");
  titleString.position(600, 0);
  titleString.style("color", "#ffffff");
  titleString.html("ILLUMISTACK, open dev console to see layer changes");

  color1Picker = select("#color1");
  color2Picker = select("#color2");
  color3Picker = select("#color3"); // New color picker

  // Create the saveToggle checkbox
  saveToggle = createCheckbox("Show only copy image", false);
  saveToggle.position(370, 90); // Adjust position to the right of the transition sliders
  saveToggle.style("color", "#ffffff");
  saveToggle.changed(draw); // Redraw the canvas when the checkbox state changes

  //total layer slider
  totalLayersSlider = createSlider(1, 100, 15); // min: 1, max: 100, default: 20
  totalLayersSlider.position(20, 30);
  totalLayersSliderValue = createElement("h2");
  totalLayersSliderValue.position(5, 30);
  totalLayersSliderValue.style("color", "#ffffff");
  totalLayersSliderValue.html("Total Layers: " + totalLayersSlider.value());
  totalLayersSlider.input(() => {
    totalLayersSliderValue.html("Total Layers: " + totalLayersSlider.value());
    subd = parseInt(range / totalLayersSlider.value()); // Recalculate subd
    updateTransitionSlidersMax();
  });

  //recompute button
  recomputeButton = createButton("Recompute Image");
  recomputeButton.position(10, 90);
  recomputeButton.mousePressed(recomputeImage);

  colorToggle = createCheckbox("Use three colors", false);
  colorToggle.position(370, 110);
  colorToggle.style("color", "#ffffff");

  colorToggle.changed(toggleColors);

  //Transition Sliders
  let layers = totalLayersSlider.value();
  transition1Slider = createSlider(1, layers, 3); // min: 1, max: layers, default: 3
  transition1Slider.position(200, 30);
  transition1SliderValue = createElement("h2");
  transition1SliderValue.position(370, 10);
  transition1SliderValue.style("color", "#ffffff");
  transition1SliderValue.html("Transition 1: " + transition1Slider.value());

  transition1Slider.input(() => {
    transition1SliderValue.html("Transition 1: " + transition1Slider.value());
  });

  transition2Slider = createSlider(1, layers, 6); // min: 1, max: layers, default: 11
  transition2Slider.position(200, 50);
  transition2SliderValue = createElement("h2");
  transition2SliderValue.position(370, 30);
  transition2SliderValue.style("color", "#ffffff");
  transition2SliderValue.html("Transition 2: " + transition2Slider.value());

  transition2Slider.input(() => {
    transition2SliderValue.html("Transition 2: " + transition2Slider.value());
  });

  transition3Slider = createSlider(1, layers, 9); // min: 1, max: layers, default: 19
  transition3Slider.position(200, 70); // Position adjusted to be under the other sliders

  transition3SliderValue = createElement("h2");
  transition3SliderValue.position(370, 50); // Position adjusted to be under the other sliders
  transition3SliderValue.style("color", "#ffffff");
  transition3SliderValue.html("Transition 3: " + transition3Slider.value());
  transition3Slider.input(() => {
    transition3SliderValue.html("Transition 3: " + transition3Slider.value());
  });
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
  img.resize(img.width / factor, img.height / factor);
  copy.resize(copy.width / factor, copy.height / factor);
  img.loadPixels();
  copy.loadPixels();
  createCanvas(img.width * 2 + 20, img.height);
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

  //After recomputing the image, create a 3d model
  copy.loadPixels(); // Ensure that the pixel data is loaded
  create3DModel();
}

function create3DModel() {
  // Convert the image into a heightmap
  copy.loadPixels();
  let heightmap = [];
  for (let i = 0; i < copy.pixels.length; i += 4) {
    let brightness =
      (copy.pixels[i] + copy.pixels[i + 1] + copy.pixels[i + 2]) / 3;
    heightmap.push(brightness);
  }
  console.log("heightmap", heightmap);
  // Create a 3D mesh from the heightmap
  let geometry = new THREE.PlaneGeometry(1, 1, copy.width - 1, copy.height - 1);
  let vertices = geometry.attributes.position.array;

  console.log("geometry", geometry);
  for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
    vertices[i + 2] = (heightmap[j] / 255) * 10; // Multiply by 10 to make the variations in height more noticeable
  }
  geometry.attributes.position.needsUpdate = true; // This line is important
  material = new THREE.MeshPhongMaterial({
    color: new THREE.Color(0xd5d5d5),
  });
  let mesh = new THREE.Mesh(geometry, material);

  // Remove the old mesh from the scene and add the new one
  if (currentMesh !== null) {
    scene.remove(currentMesh);
  }
  mesh.rotation.x = Math.PI / 2; // Rotate 90 degrees around the x-axis
  mesh.rotation.z = Math.PI; // Rotate 90 degrees around the x-axis

  mesh.position.y = 20; // Move the mesh 10 units up
  mesh.scale.set(100, 100, 1); // Scale the mesh by a factor of 10

  scene.add(mesh);

  // Update the currentMesh variable to refer to the new mesh
  currentMesh = mesh;

  // Point the camera at the new mesh
  camera.position.z = 1; // Move the camera closer
  camera.lookAt(mesh.position);
}

function draw() {
  if (saveToggle.checked()) {
    // If the checkbox is checked, resize the canvas to fit only the copy image
    resizeCanvas(copy.width, copy.height);
    image(copy, 0, 0);
  } else {
    // If the checkbox is unchecked, resize the canvas to fit both the original and copy images
    resizeCanvas(img.width * 2 + 20, img.height);
    image(img, img.width + 20, 0);
    image(copy, 0, 0);
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
              current_color = [base_color, 0.2];
              break;
            case layer <= transition1:
              current_color = [color1, 0.4];
              break;
            case layer <= transition2:
              current_color = [color2, 0.3];
              break;
            case layer <= transition3:
              current_color = [color3, 0.05]; // New color
              break;
            case layer <= layers:
              current_color = ["white", 0.1];
              break;
          }
        } else {
          // Checkbox is unchecked, use two colors
          switch (true) {
            case layer <= 1:
              current_color = [base_color, 0.2];
              break;
            case layer <= transition1:
              current_color = [color1, 0.4];
              break;
            case layer <= transition2:
              current_color = [color2, 0.1];
              break;
            case layer <= layers:
              current_color = ["white", 0.15];
              break;
          }
        }
        color_layer(current_color);
      }
    }
    console.log("Layer " + layer + ", with " + current_color);
    copy.updatePixels();
    image(copy, 0, 0);
    if (saveToggle.checked()) {
      image(copy, 0, 0);
    } else {
      image(img, img.width + 20, 0);
      image(copy, 0, 0);
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
function animate() {
  requestAnimationFrame(animate);
  // controls.update();

  renderer.render(scene, camera);
}
// function animate() {

//   requestAnimationFrame(animate);

//   renderer.render(scene, camera);
//   console.log("animation");
// }
