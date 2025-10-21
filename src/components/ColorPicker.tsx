import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Slider from '@radix-ui/react-slider';

interface Color {
  r: number;
  g: number;
  b: number;
}

interface ColorPickerProps {
  colors: Color[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onAddColor: (color: Color) => void;
  onRemoveColor: (index: number) => void;
}

export default function ColorPicker({
  colors,
  selectedIndex,
  onSelect,
  onAddColor,
  onRemoveColor
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [r, setR] = useState(128);
  const [g, setG] = useState(128);
  const [b, setB] = useState(128);

  const swatchSize = 40;

  const handleAddColor = () => {
    onAddColor({ r, g, b });
    setOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
      {colors.map((color, index) => (
        <div key={index} style={{ position: 'relative', display: 'inline-block' }}>
          <div
            onClick={() => onSelect(index)}
            style={{
              width: swatchSize,
              height: swatchSize,
              background: `rgb(${color.r}, ${color.g}, ${color.b})`,
              border: selectedIndex === index ? '3px solid #ffffff' : '1px solid #666',
              borderRadius: '4px',
              cursor: 'pointer',
              boxSizing: 'border-box',
            }}
          />
          {colors.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveColor(index);
              }}
              style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#f44336',
                color: 'white',
                border: '1px solid white',
                cursor: 'pointer',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {/* Add Color Button with Popover */}
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <div
            style={{
              width: swatchSize,
              height: swatchSize,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '2px dashed #666',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: '#999',
            }}
          >
            +
          </div>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            style={{
              background: 'rgba(0, 0, 0, 0.95)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #444',
              width: '200px',
              zIndex: 1000,
            }}
            sideOffset={5}
          >
            <div style={{ marginBottom: '12px', fontSize: '12px', fontWeight: 'bold', color: 'white' }}>
              Add Custom Color
            </div>

            {/* Color Preview */}
            <div style={{
              width: '100%',
              height: '40px',
              background: `rgb(${r}, ${g}, ${b})`,
              borderRadius: '4px',
              marginBottom: '16px',
              border: '1px solid #666',
            }} />

            {/* RGB Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'white', display: 'block', marginBottom: '4px' }}>
                  R: {r}
                </label>
                <Slider.Root
                  className="slider-root"
                  value={[r]}
                  onValueChange={(value) => setR(value[0])}
                  max={255}
                  step={1}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', userSelect: 'none', touchAction: 'none', width: '100%', height: 20 }}
                >
                  <Slider.Track style={{ background: '#666', position: 'relative', flexGrow: 1, borderRadius: 9999, height: 6 }}>
                    <Slider.Range style={{ position: 'absolute', background: '#ff0000', borderRadius: 9999, height: '100%' }} />
                  </Slider.Track>
                  <Slider.Thumb style={{ display: 'block', width: 16, height: 16, background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.5)', borderRadius: 10, cursor: 'grab' }} />
                </Slider.Root>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'white', display: 'block', marginBottom: '4px' }}>
                  G: {g}
                </label>
                <Slider.Root
                  value={[g]}
                  onValueChange={(value) => setG(value[0])}
                  max={255}
                  step={1}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', userSelect: 'none', touchAction: 'none', width: '100%', height: 20 }}
                >
                  <Slider.Track style={{ background: '#666', position: 'relative', flexGrow: 1, borderRadius: 9999, height: 6 }}>
                    <Slider.Range style={{ position: 'absolute', background: '#00ff00', borderRadius: 9999, height: '100%' }} />
                  </Slider.Track>
                  <Slider.Thumb style={{ display: 'block', width: 16, height: 16, background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.5)', borderRadius: 10, cursor: 'grab' }} />
                </Slider.Root>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'white', display: 'block', marginBottom: '4px' }}>
                  B: {b}
                </label>
                <Slider.Root
                  value={[b]}
                  onValueChange={(value) => setB(value[0])}
                  max={255}
                  step={1}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', userSelect: 'none', touchAction: 'none', width: '100%', height: 20 }}
                >
                  <Slider.Track style={{ background: '#666', position: 'relative', flexGrow: 1, borderRadius: 9999, height: 6 }}>
                    <Slider.Range style={{ position: 'absolute', background: '#0000ff', borderRadius: 9999, height: '100%' }} />
                  </Slider.Track>
                  <Slider.Thumb style={{ display: 'block', width: 16, height: 16, background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.5)', borderRadius: 10, cursor: 'grab' }} />
                </Slider.Root>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={handleAddColor}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              >
                Add
              </button>
              <Popover.Close asChild>
                <button
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid #666',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  Cancel
                </button>
              </Popover.Close>
            </div>

            <Popover.Arrow style={{ fill: 'rgba(0, 0, 0, 0.95)' }} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
