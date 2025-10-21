import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function KeyboardTyping() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentChar, setCurrentChar] = useState('A');
  const [fontLoaded, setFontLoaded] = useState(false);
  const fontRef = useRef<any>(null);

  // Load font
  useEffect(() => {
    const loader = new FontLoader();
    loader.load(
      'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json',
      (font) => {
        fontRef.current = font;
        setFontLoaded(true);
        console.log('Font loaded!');
      }
    );
  }, []);

  // Main Three.js setup
  useEffect(() => {
    if (!containerRef.current || !fontRef.current) return;

    console.log('Starting Three.js setup');

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera
    const camera = new THREE.PerspectiveCamera(30, width / height, 1, 10000);
    camera.position.set(0, 0, 800);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(0, 0, 1).normalize();
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xffffff, 4.5);
    pointLight.position.set(0, 100, 90);
    scene.add(pointLight);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Create text mesh
    const createText = (char: string) => {
      const textGeometry = new TextGeometry(char, {
        font: fontRef.current,
        size: 80,
        depth: 20,
        curveSegments: 4,
        bevelEnabled: true,
        bevelThickness: 2,
        bevelSize: 1.5,
        bevelOffset: 0,
        bevelSegments: 3,
      });

      textGeometry.computeBoundingBox();
      if (textGeometry.boundingBox) {
        const centerOffset = new THREE.Vector3();
        textGeometry.boundingBox.getCenter(centerOffset);
        textGeometry.translate(-centerOffset.x, -centerOffset.y, -centerOffset.z);
      }

      const materials = [
        new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true }),
        new THREE.MeshPhongMaterial({ color: 0x667eea })
      ];

      return new THREE.Mesh(textGeometry, materials);
    };

    // Initial text
    let textMesh = createText(currentChar);
    scene.add(textMesh);
    console.log('Initial text added');

    // Handle key presses
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      let char = event.key;
      if (char === ' ') {
        char = '␣';
      } else if (char.length > 1) {
        return;
      }

      char = char.toUpperCase();
      console.log('Key pressed:', char);
      setCurrentChar(char);

      // Remove old text
      scene.remove(textMesh);
      textMesh.geometry.dispose();

      // Add new text
      textMesh = createText(char);
      scene.add(textMesh);
      console.log('Text updated to:', char);
    };

    window.addEventListener('keydown', handleKeyDown);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();

      if (textMesh) {
        textMesh.rotation.y += 0.01;
        textMesh.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
      }

      renderer.render(scene, camera);
    };
    animate();
    console.log('Animation started');

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      console.log('Cleaning up');
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.remove(textMesh);
      textMesh.geometry.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [fontLoaded, currentChar]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          color: 'white',
          fontFamily: 'monospace',
          fontSize: '18px',
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '10px 20px',
          borderRadius: '8px',
        }}
      >
        {!fontLoaded ? (
          <div>Loading font...</div>
        ) : (
          <div>
            <div>Type any key!</div>
            <div style={{ marginTop: '10px', fontSize: '14px', opacity: 0.7 }}>
              Current: {currentChar}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
