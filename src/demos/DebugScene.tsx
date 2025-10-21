import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createDebugScene, disposeObjects, createIsometricCamera } from '../utils/threeHelpers';

export default function DebugScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Camera - Isometric view with Z-up (same as other demos)
    const camera = createIsometricCamera(width, height, 600);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Add OrbitControls for mouse interaction
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.target.set(0, 0, 0);

    // Add debug scene elements (same scale as other demos)
    const debugElements = createDebugScene(200, 400);
    debugElements.forEach((element) => scene.add(element));

    // Render loop
    const animate = () => {
      const animationId = requestAnimationFrame(animate);
      controls.update(); // Update controls for damping
      renderer.render(scene, camera);
      return animationId;
    };
    const animationId = animate();

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
      controls.dispose();
      renderer.dispose();

      // Dispose debug elements
      debugElements.forEach((element) => scene.remove(element));
      disposeObjects(debugElements);

      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
