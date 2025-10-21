import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useDebugScene } from '../hooks/useDebugScene';
import { createIsometricCamera } from '../utils/threeHelpers';
import DebugOverlay, { DebugText, DebugButton } from '../components/DebugOverlay';

export default function RotatingCube() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const { debugEnabled, toggleDebug } = useDebugScene(sceneRef.current);

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

    // Create cube
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0x667eea,
      wireframe: false,
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Add edges for better visibility
    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
    cube.add(edgeLines);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Rotate around multiple axes for visual interest
      cube.rotation.x += 0.01;
      cube.rotation.z += 0.01;

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
      container.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <DebugOverlay>
        <div>Rotating Cube</div>
        <DebugText secondary>Basic Three.js setup</DebugText>
        <DebugButton onClick={toggleDebug} active={debugEnabled}>
          {debugEnabled ? "Hide Debug" : "Show Debug"}
        </DebugButton>
      </DebugOverlay>
    </div>
  );
}
