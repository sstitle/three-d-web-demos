import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import DebugOverlay from '../components/DebugOverlay';
import { createIsometricCamera } from '../utils/threeHelpers';

interface NoiseParams {
  scale: number;
  seed: number;
  amplitude: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  heightScale: number;
  resolution: number;
}

export default function SimplexNoiseVisualizer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  const [params, setParams] = useState<NoiseParams>({
    scale: 0.05,
    seed: 12345,
    amplitude: 1.0,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2.0,
    heightScale: 5.0,
    resolution: 128,
  });

  // Generate noise data with FBM (Fractal Brownian Motion)
  const noiseData = useMemo(() => {
    // Create a seeded random number generator for simplex noise
    const alea = (seed: number) => {
      let s = seed;
      return () => {
        s = Math.imul(s ^ (s >>> 16), 0x85ebca6b);
        s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35);
        return ((s ^ (s >>> 16)) >>> 0) / 2 ** 32;
      };
    };

    const noise2D = createNoise2D(alea(params.seed));
    const res = params.resolution;
    const data = new Float32Array(res * res);

    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        let value = 0;
        let frequency = params.scale;
        let amplitude = 1.0; // Start with amplitude 1.0 for FBM
        let maxValue = 0;

        // FBM: Layer multiple octaves of noise
        for (let octave = 0; octave < params.octaves; octave++) {
          const sampleX = x * frequency;
          const sampleY = y * frequency;

          value += noise2D(sampleX, sampleY) * amplitude;
          maxValue += amplitude;

          amplitude *= params.persistence;
          frequency *= params.lacunarity;
        }

        // Normalize to [-1, 1] range, then apply amplitude
        value = (value / maxValue) * params.amplitude;
        data[y * res + x] = value;
      }
    }

    return data;
  }, [params.scale, params.seed, params.amplitude, params.octaves, params.persistence, params.lacunarity, params.resolution]);

  // Initialize scene
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
    const camera = createIsometricCamera(width, height, 60);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(
      50, 50,
      params.resolution - 1,
      params.resolution - 1
    );

    // Create material
    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      flatShading: false,
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    meshRef.current = mesh;
    scene.add(mesh);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Slow rotation for better viewing
      if (meshRef.current) {
        meshRef.current.rotation.z += 0.001;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle container resize
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
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [params.resolution]);

  // Update mesh with noise data
  useEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const geometry = mesh.geometry as THREE.PlaneGeometry;
    const position = geometry.attributes.position;
    const res = params.resolution;

    // Update vertex heights
    for (let i = 0; i < res * res; i++) {
      const noiseValue = noiseData[i];
      position.setZ(i, noiseValue * params.heightScale);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();

    // Update vertex colors based on height
    const colors = new Float32Array(res * res * 3);
    for (let i = 0; i < res * res; i++) {
      const noiseValue = noiseData[i];
      const normalizedValue = (noiseValue + 1) / 2; // Convert from [-1,1] to [0,1]

      // Simple grayscale
      colors[i * 3] = normalizedValue;
      colors[i * 3 + 1] = normalizedValue;
      colors[i * 3 + 2] = normalizedValue;
    }

    const colorAttribute = new THREE.BufferAttribute(colors, 3);
    geometry.setAttribute('color', colorAttribute);
    geometry.attributes.color.needsUpdate = true;
  }, [noiseData, params.heightScale, params.resolution]);

  const handleParamChange = (key: keyof NoiseParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const randomizeSeed = () => {
    setParams(prev => ({ ...prev, seed: Math.floor(Math.random() * 1000000) }));
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <DebugOverlay>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <strong>Noise Parameters</strong>
          </div>

          <div>
            <label>
              Scale: {params.scale.toFixed(3)}
              <input
                type="range"
                min="0.001"
                max="0.2"
                step="0.001"
                value={params.scale}
                onChange={(e) => handleParamChange('scale', parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ flex: 1 }}>
              Seed:
              <input
                type="number"
                value={params.seed}
                onChange={(e) => handleParamChange('seed', parseInt(e.target.value))}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </label>
            <button onClick={randomizeSeed} style={{ padding: '4px 8px' }}>
              Random
            </button>
          </div>

          <div>
            <label>
              Amplitude: {params.amplitude.toFixed(1)}
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={params.amplitude}
                onChange={(e) => handleParamChange('amplitude', parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </label>
          </div>

          <div>
            <strong style={{ marginTop: '8px', display: 'block' }}>FBM Settings</strong>
          </div>

          <div>
            <label>
              Octaves: {params.octaves}
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={params.octaves}
                onChange={(e) => handleParamChange('octaves', parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </label>
          </div>

          <div>
            <label>
              Persistence: {params.persistence.toFixed(2)}
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={params.persistence}
                onChange={(e) => handleParamChange('persistence', parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </label>
          </div>

          <div>
            <label>
              Lacunarity: {params.lacunarity.toFixed(1)}
              <input
                type="range"
                min="1.0"
                max="4.0"
                step="0.1"
                value={params.lacunarity}
                onChange={(e) => handleParamChange('lacunarity', parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </label>
          </div>

          <div>
            <strong style={{ marginTop: '8px', display: 'block' }}>Display</strong>
          </div>

          <div>
            <label>
              Height Scale: {params.heightScale.toFixed(1)}
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={params.heightScale}
                onChange={(e) => handleParamChange('heightScale', parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </label>
          </div>

          <div>
            <label>
              Resolution: {params.resolution}
              <select
                value={params.resolution}
                onChange={(e) => handleParamChange('resolution', parseInt(e.target.value))}
                style={{ width: '100%', marginTop: '4px' }}
              >
                <option value="64">64×64</option>
                <option value="128">128×128</option>
                <option value="256">256×256</option>
                <option value="512">512×512</option>
              </select>
            </label>
          </div>
        </div>
      </DebugOverlay>
    </div>
  );
}
