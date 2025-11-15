# 3MF Format Analysis for IllumiStack

## Overview
**3MF (3D Manufacturing Format)** is a modern file format that can embed much more information than STL, including color changes, material specifications, and layer-specific settings.

## Advantages over STL

### ✅ What 3MF Can Include:
1. **Geometry** - Like STL, but more efficient
2. **Color Information** - Per-vertex or per-face colors
3. **Material Definitions** - Multiple materials in one file
4. **Metadata** - Layer heights, print settings, support structures
5. **Textures** - UV mapping and texture data
6. **Build Instructions** - Orientation, scaling, positioning
7. **Custom Extensions** - Slicer-specific data

### 🎯 For IllumiStack Specifically:
- **Layer-based Color Changes**: Yes, through custom extensions
- **Embedded Layer Heights**: Yes, in metadata
- **Material/Filament Switching**: Yes, with proper structure
- **Slicer Compatibility**: Varies by slicer

## 3MF Structure for Multi-Color Printing

```xml
<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <basematerials id="1">
      <base name="Black" displaycolor="#000000" />
      <base name="Purple" displaycolor="#6600FF" />
      <base name="Gold" displaycolor="#DDB878" />
      <base name="White" displaycolor="#FFFFFF" />
    </basematerials>
    <object id="2" type="model">
      <mesh>
        <vertices>
          <!-- Vertex data -->
        </vertices>
        <triangles>
          <!-- Triangle data with material references -->
          <triangle v1="0" v2="1" v3="2" pid="1" p1="0"/>
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="2" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>
  </build>
</model>
```

## Slicer Support

### PrusaSlicer / SuperSlicer
- ✅ Full 3MF support
- ✅ Multi-material/color support
- ✅ Can read custom layer change metadata
- ⚠️ Layer-specific color changes require M600 gcode or MMU

### Cura
- ✅ Reads 3MF geometry and colors
- ⚠️ Limited automatic color change support
- ⚠️ Requires custom post-processing scripts for layer changes

### Bambu Studio
- ✅ Excellent 3MF support
- ✅ Native multi-color with AMS
- ✅ Per-layer color changes via "Modifier" meshes

### OrcaSlicer
- ✅ Full 3MF support (fork of Bambu Studio)
- ✅ Best support for embedded layer changes
- ✅ Can auto-generate color changes from 3MF data

## Implementation Complexity

### Easy (1-2 days):
- Basic 3MF export with geometry
- Material color definitions
- Per-triangle color assignment

### Medium (3-5 days):
- Proper XML structure with compression
- Height-based color zones
- Slicer-agnostic metadata

### Hard (1-2 weeks):
- Slicer-specific extensions (PrusaSlicer, Bambu, etc.)
- Automatic gcode injection for layer changes
- Testing across multiple slicers

## Recommended Approach

### Phase 1: Basic 3MF Export
Generate 3MF with:
- Mesh geometry (like current STL)
- Base material definitions (colors)
- Per-face color assignment based on Z-height

### Phase 2: Slicer-Specific Extensions
Add support for specific slicers:
- **OrcaSlicer/Bambu**: Height ranges with material assignments
- **PrusaSlicer**: Custom metadata for M600 insertion
- **Cura**: Post-processing script generation

### Phase 3: Advanced Features
- Preview of color changes in 3MF viewers
- Export with support structures
- Multi-part assemblies

## JavaScript Libraries for 3MF

### Option 1: Manual XML Generation
```javascript
function generate3MF(meshData, colorLayers) {
  const zip = new JSZip();
  
  // Create XML structure
  const xmlContent = generateModelXML(meshData, colorLayers);
  zip.file("3D/3dmodel.model", xmlContent);
  
  // Create relationships
  const relsContent = generateRelsXML();
  zip.file("_rels/.rels", relsContent);
  
  // Create content types
  const contentTypes = generateContentTypesXML();
  zip.file("[Content_Types].xml", contentTypes);
  
  // Generate compressed 3MF
  return zip.generateAsync({type: "blob", compression: "DEFLATE"});
}
```

### Option 2: Use Three.js 3MF Exporter
- `THREE.3MFExporter` (community plugin)
- Simpler but less control over metadata

### Option 3: Use node-3mf (requires build step)
- More robust
- Better standard compliance
- Harder to integrate in browser

## Real-World Workflow

### Current (with STL):
1. Generate STL
2. Import to slicer
3. **Manually** add color changes at specific layers
4. Slice and print

### With Smart 3MF:
1. Generate 3MF with embedded layer/color data
2. Import to slicer (color changes auto-detected)
3. Slice and print

### With Advanced 3MF + Slicer Plugin:
1. Generate 3MF
2. Import to slicer
3. **Automatic** M600/filament change gcode insertion
4. Preview shows exact colors
5. Slice and print

## Recommendation for IllumiStack

### Short Term:
✅ **Keep STL export** - Universal compatibility
✅ **Add 3MF export option** - Better for multi-color users
✅ **Include layer info in filename/metadata** - Easy reference

### Long Term:
✅ **3MF with per-triangle colors** - Visual preview
✅ **OrcaSlicer/Bambu optimization** - Best multi-color support
✅ **Generate companion gcode script** - For manual slicer import

## Code Example: Basic 3MF Export

```javascript
function exportAs3MF() {
  const { vertices, indices, width, height, depth } = meshData;
  const colors = getColorLayers(); // Your layer colors
  
  // Build 3MF XML
  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Application">IllumiStack</metadata>
  <metadata name="LayerHeight">${layerHeight}</metadata>
  <metadata name="ColorTransitions">${JSON.stringify(colors)}</metadata>
  <resources>
    ${generateMaterials(colors)}
    ${generateMesh(vertices, indices)}
  </resources>
  <build>
    <item objectid="1"/>
  </build>
</model>`;

  // Package as 3MF (zip file)
  const zip = new JSZip();
  zip.file("3D/3dmodel.model", model);
  zip.file("_rels/.rels", getRelsXML());
  zip.file("[Content_Types].xml", getContentTypesXML());
  
  return zip.generateAsync({type: "blob"});
}
```

## Conclusion

**YES, 3MF is worth implementing** for IllumiStack because:

1. ✅ Native multi-color support
2. ✅ Better than STL for your use case
3. ✅ Growing slicer adoption
4. ✅ Can embed exact layer change instructions
5. ✅ More future-proof format

**Start with**: Basic 3MF export with color metadata
**Optimize for**: OrcaSlicer/Bambu Studio (best multi-color support)
**Keep**: STL export for universal compatibility

The implementation would take 3-5 days for a solid basic version, and provide significant value for users with multi-material printers.

