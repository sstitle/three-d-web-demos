import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AsciiEffect } from 'three/examples/jsm/effects/AsciiEffect.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { useDebugScene } from '../hooks/useDebugScene';
import { setupLighting, createIsometricCamera } from '../utils/threeHelpers';
import DebugOverlay, { DebugText, DebugButton } from '../components/DebugOverlay';

export default function AsciiEffectDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const { debugEnabled, toggleDebug } = useDebugScene(sceneRef.current);
  const [asciiEnabled, setAsciiEnabled] = useState(true);
  const [asciiGradient, setAsciiGradient] = useState(' .:-+*=%@#');

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0, 0, 0);
    sceneRef.current = scene;

    // Camera - Isometric view with Z-up
    const camera = createIsometricCamera(width, height, 600, 70, 1, 1000);

    // Lights
    setupLighting(scene, 'bright');

    // Sphere
    const sphereGeometry = new THREE.SphereGeometry(200, 20, 10);
    const sphereMaterial = new THREE.MeshPhongMaterial({ flatShading: true });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    // Plane (XY plane at Z = -200 for Z-up)
    const planeGeometry = new THREE.PlaneGeometry(400, 400);
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xe0e0e0 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.z = -200;
    // No rotation needed - plane is already in XY plane
    scene.add(plane);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);

    // ASCII Effect or regular renderer
    let effect: AsciiEffect | null = null;
    let currentElement: HTMLElement;

    if (asciiEnabled) {
      effect = new AsciiEffect(renderer, asciiGradient, { invert: true });
      effect.setSize(width, height);
      effect.domElement.style.color = 'white';
      effect.domElement.style.backgroundColor = 'black';
      currentElement = effect.domElement;
    } else {
      currentElement = renderer.domElement;
    }

    container.appendChild(currentElement);

    // Controls
    const controls = new TrackballControls(camera, currentElement);

    // Animation
    let animationId: number;
    const start = Date.now();

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const timer = Date.now() - start;

      // Bounce in Z direction (up/down)
      sphere.position.z = Math.abs(Math.sin(timer * 0.002)) * 150;
      // Rotate around Z axis
      sphere.rotation.z = timer * 0.0003;
      sphere.rotation.x = timer * 0.0002;

      controls.update();

      if (effect) {
        effect.render(scene, camera);
      } else {
        renderer.render(scene, camera);
      }
    };
    animate();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
      if (effect) {
        effect.setSize(newWidth, newHeight);
      }
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      planeGeometry.dispose();
      planeMaterial.dispose();
      container.removeChild(currentElement);
      sceneRef.current = null;
    };
  }, [asciiEnabled, asciiGradient]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <DebugOverlay>
        <div>ASCII Effect Rendering</div>
        <DebugText secondary>Drag to rotate • Scroll to zoom</DebugText>
        <DebugButton onClick={() => setAsciiEnabled(!asciiEnabled)} active={asciiEnabled}>
          {asciiEnabled ? "Disable ASCII" : "Enable ASCII"}
        </DebugButton>
        {asciiEnabled && (
          <div style={{ marginTop: "10px" }}>
            <label style={{ fontSize: "12px", opacity: 0.7, display: "block", marginBottom: "4px" }}>
              ASCII Gradient:
            </label>
            <input
              type="text"
              value={asciiGradient}
              onChange={(e) => setAsciiGradient(e.target.value)}
              style={{
                width: "100%",
                padding: "4px 8px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "12px",
              }}
            />
          </div>
        )}
        <DebugButton onClick={toggleDebug} active={debugEnabled}>
          {debugEnabled ? "Hide Debug" : "Show Debug"}
        </DebugButton>
      </DebugOverlay>
    </div>
  );
}
