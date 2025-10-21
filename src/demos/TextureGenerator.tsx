import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useDebugScene } from '../hooks/useDebugScene';
import { createIsometricCamera } from '../utils/threeHelpers';
import DebugOverlay, { DebugText, DebugButton } from '../components/DebugOverlay';

type TextureMode = 'solid' | 'xor';

export default function TextureGenerator() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const textureRef = useRef<THREE.DataTexture | null>(null);
  const { debugEnabled, toggleDebug } = useDebugScene(sceneRef.current);

  const [textureMode, setTextureMode] = useState<TextureMode>('solid');
  const [solidColor, setSolidColor] = useState('#667eea');
  const [xorDepth, setXorDepth] = useState(8);

  // Generate solid color texture
  const generateSolidTexture = (color: string): THREE.DataTexture => {
    const size = 256;
    const data = new Uint8Array(size * size * 4);

    // Convert hex color to RGB
    const rgb = parseInt(color.slice(1), 16);
    const r = (rgb >> 16) & 255;
    const g = (rgb >> 8) & 255;
    const b = rgb & 255;

    for (let i = 0; i < size * size; i++) {
      const stride = i * 4;
      data[stride] = r;
      data[stride + 1] = g;
      data[stride + 2] = b;
      data[stride + 3] = 255;
    }

    const texture = new THREE.DataTexture(data, size, size);
    texture.needsUpdate = true;
    return texture;
  };

  // Generate XOR pattern texture
  const generateXorTexture = (depth: number): THREE.DataTexture => {
    const size = 256;
    const data = new Uint8Array(size * size * 4);
    const scale = Math.pow(2, depth);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const value = ((x * scale) ^ (y * scale)) % 256;
        const i = (y * size + x) * 4;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = 255;
      }
    }

    const texture = new THREE.DataTexture(data, size, size);
    texture.needsUpdate = true;
    return texture;
  };

  // Update texture when settings change
  useEffect(() => {
    if (!materialRef.current) return;

    // Dispose old texture
    if (textureRef.current) {
      textureRef.current.dispose();
    }

    // Generate new texture
    const newTexture = textureMode === 'solid'
      ? generateSolidTexture(solidColor)
      : generateXorTexture(xorDepth);

    textureRef.current = newTexture;
    materialRef.current.map = newTexture;
    materialRef.current.needsUpdate = true;
  }, [textureMode, solidColor, xorDepth]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera - Isometric view with Z-up
    const camera = createIsometricCamera(width, height, 6);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Create initial texture
    const initialTexture = generateSolidTexture(solidColor);
    textureRef.current = initialTexture;

    // Create cube with texture
    const geometry = new THREE.BoxGeometry(3, 3, 3);
    const material = new THREE.MeshBasicMaterial({
      map: initialTexture,
    });
    materialRef.current = material;
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Add edges for better visibility
    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true });
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
    cube.add(edgeLines);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Slow rotation to show texture
      cube.rotation.x += 0.005;
      cube.rotation.z += 0.005;

      renderer.render(scene, camera);
    };
    animate();

    // Handle container resize using ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        const newHeight = entry.contentRect.height;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      }
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationId);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      edgeMaterial.dispose();
      if (textureRef.current) {
        textureRef.current.dispose();
      }
      container.removeChild(renderer.domElement);
      sceneRef.current = null;
      materialRef.current = null;
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <DebugOverlay>
        <div>Texture Generator</div>
        <DebugText secondary>Procedural texture generation</DebugText>

        <div style={{ marginTop: '15px' }}>
          <DebugButton
            onClick={() => setTextureMode('solid')}
            active={textureMode === 'solid'}
          >
            Solid
          </DebugButton>
          <DebugButton
            onClick={() => setTextureMode('xor')}
            active={textureMode === 'xor'}
            style={{ marginLeft: '8px' }}
          >
            XOR Pattern
          </DebugButton>
        </div>

        {textureMode === 'solid' && (
          <div style={{ marginTop: '10px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px'
            }}>
              Color:
              <input
                type="color"
                value={solidColor}
                onChange={(e) => setSolidColor(e.target.value)}
                style={{
                  cursor: 'pointer',
                  width: '40px',
                  height: '30px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '4px',
                  background: 'transparent'
                }}
              />
            </label>
          </div>
        )}

        {textureMode === 'xor' && (
          <div style={{ marginTop: '10px' }}>
            <label style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              fontSize: '14px'
            }}>
              Depth/Scale: {xorDepth}
              <input
                type="range"
                min="1"
                max="16"
                step="1"
                value={xorDepth}
                onChange={(e) => setXorDepth(Number(e.target.value))}
                style={{
                  width: '150px',
                  cursor: 'pointer'
                }}
              />
            </label>
          </div>
        )}

        <DebugButton onClick={toggleDebug} active={debugEnabled} style={{ marginTop: '15px' }}>
          {debugEnabled ? "Hide Debug" : "Show Debug"}
        </DebugButton>
      </DebugOverlay>
    </div>
  );
}
