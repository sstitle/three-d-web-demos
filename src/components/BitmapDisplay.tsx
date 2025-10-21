import { useRef, useEffect } from 'react';

interface BitmapDisplayProps {
  data: Uint8ClampedArray; // RGBA pixel data
  width: number;
  height: number;
  scale?: number; // Display scale (default 1)
}

export default function BitmapDisplay({ data, width, height, scale = 1 }: BitmapDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const displayWidth = width * scale;
    const displayHeight = height * scale;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Create temporary canvas for the actual pixel data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    if (tempCtx) {
      const imageData = tempCtx.createImageData(width, height);
      imageData.data.set(data);
      tempCtx.putImageData(imageData, 0, 0);

      // Scale it up to the display canvas
      ctx.imageSmoothingEnabled = false; // Pixelated look
      ctx.drawImage(tempCanvas, 0, 0, displayWidth, displayHeight);
    }
  }, [data, width, height, scale]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        imageRendering: 'pixelated',
        border: '2px solid #444',
        borderRadius: '4px',
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
      }}
    />
  );
}
