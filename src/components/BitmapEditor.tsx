import { useRef, useEffect, useState } from 'react';

interface Color {
  r: number;
  g: number;
  b: number;
}

interface BitmapEditorProps {
  size: number; // Grid size (e.g., 16 for 16x16)
  data: number[][]; // Color indices (-1 for empty)
  colors: Color[]; // Available color palette
  selectedColor: number;
  onDataChange: (data: number[][]) => void;
  onColorSelect?: (index: number) => void;
}

export default function BitmapEditor({
  size,
  data,
  colors,
  selectedColor,
  onDataChange
}: BitmapEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'paint' | 'erase'>('paint');

  const cellSize = 24; // Pixel size for each cell

  // Draw the bitmap
  const draw = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const canvasSize = size * cellSize;
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    // Draw grid cells
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const colorIndex = data[y][x];

        if (colorIndex === -1 || colorIndex === undefined) {
          ctx.fillStyle = '#ffffff';
        } else if (colorIndex >= 0 && colorIndex < colors.length) {
          const color = colors[colorIndex];
          ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        } else {
          ctx.fillStyle = '#ffffff';
        }

        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    // Draw grid lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= size; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvasSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvasSize, i * cellSize);
      ctx.stroke();
    }
  };

  useEffect(() => {
    draw();
  }, [data, colors]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    if (x >= 0 && x < size && y >= 0 && y < size) {
      const newData = data.map(row => [...row]);
      newData[y][x] = tool === 'erase' ? -1 : selectedColor;
      onDataChange(newData);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    handleCanvasClick(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    handleCanvasClick(e);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const newData: number[][] = [];
    for (let y = 0; y < size; y++) {
      newData[y] = [];
      for (let x = 0; x < size; x++) {
        newData[y][x] = -1;
      }
    }
    onDataChange(newData);
  };

  const fillCanvas = () => {
    const newData: number[][] = [];
    for (let y = 0; y < size; y++) {
      newData[y] = [];
      for (let x = 0; x < size; x++) {
        newData[y][x] = selectedColor;
      }
    }
    onDataChange(newData);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          imageRendering: 'pixelated',
          border: '2px solid #444',
          borderRadius: '4px',
          cursor: tool === 'paint' ? 'crosshair' : 'not-allowed',
        }}
      />

      {/* Tools */}
      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
        <button
          onClick={() => setTool('paint')}
          style={{
            flex: 1,
            padding: '6px',
            background: tool === 'paint' ? '#4CAF50' : 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: tool === 'paint' ? '2px solid #4CAF50' : '1px solid #666',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          🖌️ Paint
        </button>
        <button
          onClick={() => setTool('erase')}
          style={{
            flex: 1,
            padding: '6px',
            background: tool === 'erase' ? '#f44336' : 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: tool === 'erase' ? '2px solid #f44336' : '1px solid #666',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          🧹 Erase
        </button>
      </div>

      {/* Canvas Actions */}
      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
        <button
          onClick={clearCanvas}
          style={{
            flex: 1,
            padding: '6px',
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid #666',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          Clear
        </button>
        <button
          onClick={fillCanvas}
          style={{
            flex: 1,
            padding: '6px',
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid #666',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          Fill
        </button>
      </div>

      {/* Info */}
      <div style={{ fontSize: '0.8em', color: '#aaa', textAlign: 'center' }}>
        {tool === 'paint' ? 'Click/drag to paint' : 'Click/drag to erase'}
      </div>
    </div>
  );
}
