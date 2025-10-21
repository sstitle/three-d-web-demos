import { useState } from 'react';
import WFC from 'wavefunctioncollapse';
import DebugOverlay from '../components/DebugOverlay';
import BitmapEditor from '../components/BitmapEditor';
import ColorPicker from '../components/ColorPicker';
import BitmapDisplay from '../components/BitmapDisplay';

type ViewMode = 'edit' | 'generate';

interface Color {
  r: number;
  g: number;
  b: number;
}

export default function WaveFunctionCollapse() {
  const editorSize = 16;

  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [periodic, setPeriodic] = useState(false);
  const [seed, setSeed] = useState(12345);
  const [isGenerating, setIsGenerating] = useState(false);

  // Color palette
  const [colors, setColors] = useState<Color[]>([
    { r: 65, g: 105, b: 225 },   // Blue
    { r: 238, g: 214, b: 175 },  // Beige
    { r: 34, g: 139, b: 34 },    // Green
    { r: 139, g: 69, b: 19 },    // Brown
  ]);
  const [selectedColor, setSelectedColor] = useState(0);

  // Editor bitmap data
  const [editorData, setEditorData] = useState<number[][]>(() => {
    const data: number[][] = [];
    for (let y = 0; y < editorSize; y++) {
      data[y] = [];
      for (let x = 0; x < editorSize; x++) {
        data[y][x] = -1; // Empty
      }
    }
    return data;
  });

  // Generated output
  const [outputData, setOutputData] = useState<Uint8ClampedArray | null>(null);
  const [outputWidth, setOutputWidth] = useState(0);
  const [outputHeight, setOutputHeight] = useState(0);

  const handleAddColor = (color: Color) => {
    setColors([...colors, color]);
  };

  const handleRemoveColor = (index: number) => {
    if (colors.length <= 1) return; // Keep at least one color

    // Adjust selection if needed
    if (selectedColor === index) {
      setSelectedColor(0);
    } else if (selectedColor > index) {
      setSelectedColor(selectedColor - 1);
    }

    // Update editor data to remove this color
    const newData = editorData.map(row =>
      row.map(cell => {
        if (cell === index) return -1; // Remove this color
        if (cell > index) return cell - 1; // Shift down
        return cell;
      })
    );
    setEditorData(newData);

    setColors(colors.filter((_, i) => i !== index));
  };

  const generate = () => {
    // Check if editor has any content
    const hasContent = editorData.some(row => row.some(cell => cell !== -1));
    if (!hasContent) {
      alert('Please paint something on the canvas first!');
      return;
    }

    setIsGenerating(true);

    setTimeout(() => {
      try {
        // Convert editor data to RGBA bitmap
        const inputData = new Uint8ClampedArray(editorSize * editorSize * 4);
        for (let y = 0; y < editorSize; y++) {
          for (let x = 0; x < editorSize; x++) {
            const colorIndex = editorData[y][x];
            const idx = (y * editorSize + x) * 4;

            if (colorIndex === -1) {
              inputData[idx] = 255;
              inputData[idx + 1] = 255;
              inputData[idx + 2] = 255;
              inputData[idx + 3] = 255;
            } else if (colorIndex >= 0 && colorIndex < colors.length) {
              const color = colors[colorIndex];
              inputData[idx] = color.r;
              inputData[idx + 1] = color.g;
              inputData[idx + 2] = color.b;
              inputData[idx + 3] = 255;
            } else {
              inputData[idx] = 255;
              inputData[idx + 1] = 255;
              inputData[idx + 2] = 255;
              inputData[idx + 3] = 255;
            }
          }
        }

        // Create seeded RNG
        const alea = (s: number) => {
          let state = s;
          return () => {
            state = Math.imul(state ^ (state >>> 16), 0x85ebca6b);
            state = Math.imul(state ^ (state >>> 13), 0xc2b2ae35);
            return ((state ^ (state >>> 16)) >>> 0) / 2 ** 32;
          };
        };

        const rng = alea(seed);

        // WFC parameters
        const N = 3; // Pattern size
        const symmetry = 8;
        const genWidth = 48; // Output size
        const genHeight = 48;

        const model = new WFC.OverlappingModel(
          inputData,
          editorSize,
          editorSize,
          N,
          genWidth,
          genHeight,
          periodic,
          periodic,
          symmetry
        );

        const success = model.generate(rng);

        if (success) {
          const generatedData = new Uint8ClampedArray(genWidth * genHeight * 4);
          model.graphics(generatedData);

          setOutputData(generatedData);
          setOutputWidth(genWidth);
          setOutputHeight(genHeight);
        } else {
          alert('WFC generation failed - try a different pattern or seed');
        }
      } catch (error) {
        console.error('WFC error:', error);
        alert('Error during generation');
      } finally {
        setIsGenerating(false);
      }
    }, 10);
  };

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000));
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
        gap: '20px',
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        {viewMode === 'edit' ? (
          <>
            <div style={{ color: '#999', fontSize: '12px', fontFamily: 'monospace' }}>
              Input Bitmap Editor (16×16)
            </div>

            <ColorPicker
              colors={colors}
              selectedIndex={selectedColor}
              onSelect={setSelectedColor}
              onAddColor={handleAddColor}
              onRemoveColor={handleRemoveColor}
            />

            <BitmapEditor
              size={editorSize}
              data={editorData}
              colors={colors}
              selectedColor={selectedColor}
              onDataChange={setEditorData}
              onColorSelect={setSelectedColor}
            />
          </>
        ) : (
          <>
            <div style={{ color: '#999', fontSize: '12px', fontFamily: 'monospace' }}>
              Generated Output
            </div>

            {outputData && (
              <BitmapDisplay
                data={outputData}
                width={outputWidth}
                height={outputHeight}
                scale={4}
              />
            )}

            {!outputData && (
              <div style={{ color: '#666', fontSize: '14px', padding: '40px', textAlign: 'center' }}>
                No output yet. Click "Generate" to create one.
              </div>
            )}
          </>
        )}
      </div>

      <DebugOverlay>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '70vh', overflowY: 'auto' }}>
          <div>
            <strong>Wave Function Collapse</strong>
          </div>

          {/* Mode Toggle */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setViewMode('edit')}
              style={{
                flex: 1,
                padding: '8px',
                background: viewMode === 'edit' ? '#667eea' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: viewMode === 'edit' ? '2px solid #667eea' : '1px solid #666',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Edit Input
            </button>
            <button
              onClick={() => setViewMode('generate')}
              style={{
                flex: 1,
                padding: '8px',
                background: viewMode === 'generate' ? '#667eea' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: viewMode === 'generate' ? '2px solid #667eea' : '1px solid #666',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              View Output
            </button>
          </div>

          {viewMode === 'generate' && (
            <>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <label style={{ flex: 1 }}>
                  Seed:
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value))}
                    style={{ width: '100%', marginTop: '4px' }}
                  />
                </label>
                <button
                  onClick={randomizeSeed}
                  style={{
                    padding: '4px 8px',
                    whiteSpace: 'nowrap',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid #666',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  Random
                </button>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={periodic}
                  onChange={(e) => setPeriodic(e.target.checked)}
                />
                Periodic (Tileable)
              </label>

              <button
                onClick={generate}
                disabled={isGenerating}
                style={{
                  padding: '8px',
                  background: isGenerating ? '#666' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>

              <div style={{ fontSize: '0.75em', color: '#999', borderTop: '1px solid #444', paddingTop: '8px' }}>
                WFC analyzes your input and learns 3×3 patterns, then generates a 48×48 output following those patterns.
              </div>
            </>
          )}
        </div>
      </DebugOverlay>
    </div>
  );
}
