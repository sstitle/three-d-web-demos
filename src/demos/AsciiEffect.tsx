import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AsciiEffect } from 'three/examples/jsm/effects/AsciiEffect.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

export default function AsciiEffectDemo() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0, 0, 0);

    // Camera
    const camera = new THREE.PerspectiveCamera(70, width / height, 1, 1000);
    camera.position.y = 150;
    camera.position.z = 500;

    // Lights
    const pointLight1 = new THREE.PointLight(0xffffff, 3, 0, 0);
    pointLight1.position.set(500, 500, 500);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 1, 0, 0);
    pointLight2.position.set(-500, -500, -500);
    scene.add(pointLight2);

    // Sphere
    const sphereGeometry = new THREE.SphereGeometry(200, 20, 10);
    const sphereMaterial = new THREE.MeshPhongMaterial({ flatShading: true });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    // Plane
    const planeGeometry = new THREE.PlaneGeometry(400, 400);
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xe0e0e0 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.y = -200;
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);

    // Renderer
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(width, height);

    // ASCII Effect
    const effect = new AsciiEffect(renderer, ' .:-+*=%@#', { invert: true });
    effect.setSize(width, height);
    effect.domElement.style.color = 'white';
    effect.domElement.style.backgroundColor = 'black';
    container.appendChild(effect.domElement);

    // Controls
    const controls = new TrackballControls(camera, effect.domElement);

    // Animation
    let animationId: number;
    const start = Date.now();

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const timer = Date.now() - start;

      sphere.position.y = Math.abs(Math.sin(timer * 0.002)) * 150;
      sphere.rotation.x = timer * 0.0003;
      sphere.rotation.z = timer * 0.0002;

      controls.update();
      effect.render(scene, camera);
    };
    animate();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
      effect.setSize(newWidth, newHeight);
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
      container.removeChild(effect.domElement);
    };
  }, []);

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
          fontSize: '14px',
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '10px 20px',
          borderRadius: '8px',
        }}
      >
        <div>ASCII Effect Rendering</div>
        <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.7 }}>
          Drag to rotate • Scroll to zoom
        </div>
      </div>
    </div>
  );
}
