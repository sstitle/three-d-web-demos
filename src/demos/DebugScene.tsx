import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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

    // Camera setup - Isometric perspective from (10, 10, 10) looking at origin
    const camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000
    );
    camera.position.set(10, 10, 10);
    camera.up.set(0, 0, 1); // Z is up
    camera.lookAt(0, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Add OrbitControls for mouse interaction
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.target.set(0, 0, 0);

    // Create coordinate axes
    // X axis - Red
    const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(5, 0, 0),
    ]);
    const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
    const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
    scene.add(xAxis);

    // Y axis - Green
    const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 5, 0),
    ]);
    const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
    const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
    scene.add(yAxis);

    // Z axis - Blue
    const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 5),
    ]);
    const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 });
    const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);
    scene.add(zAxis);

    // Add arrow cones at the end of each axis for better visualization
    const arrowLength = 0.5;
    const arrowRadius = 0.1;

    // X axis arrow (red)
    const xArrowGeometry = new THREE.ConeGeometry(arrowRadius, arrowLength, 8);
    const xArrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const xArrow = new THREE.Mesh(xArrowGeometry, xArrowMaterial);
    xArrow.position.set(5, 0, 0);
    xArrow.rotation.z = -Math.PI / 2;
    scene.add(xArrow);

    // Y axis arrow (green)
    const yArrowGeometry = new THREE.ConeGeometry(arrowRadius, arrowLength, 8);
    const yArrowMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const yArrow = new THREE.Mesh(yArrowGeometry, yArrowMaterial);
    yArrow.position.set(0, 5, 0);
    yArrow.rotation.set(0, 0, 0);
    scene.add(yArrow);

    // Z axis arrow (blue)
    const zArrowGeometry = new THREE.ConeGeometry(arrowRadius, arrowLength, 8);
    const zArrowMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const zArrow = new THREE.Mesh(zArrowGeometry, zArrowMaterial);
    zArrow.position.set(0, 0, 5);
    zArrow.rotation.x = Math.PI / 2;
    scene.add(zArrow);

    // Add a grid on the XY plane at Z=0
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    gridHelper.rotation.x = Math.PI / 2; // Rotate to XY plane
    scene.add(gridHelper);

    // Add axis labels using sprites
    const createTextSprite = (text: string, color: number) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 128;
      canvas.height = 128;

      context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      context.font = 'Bold 64px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, 64, 64);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(0.5, 0.5, 1);

      return sprite;
    };

    const xLabel = createTextSprite('X', 0xff0000);
    xLabel.position.set(5.5, 0, 0);
    scene.add(xLabel);

    const yLabel = createTextSprite('Y', 0x00ff00);
    yLabel.position.set(0, 5.5, 0);
    scene.add(yLabel);

    const zLabel = createTextSprite('Z', 0x0000ff);
    zLabel.position.set(0, 0, 5.5);
    scene.add(zLabel);

    // Add a small sphere at the origin
    const originGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const originMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const origin = new THREE.Mesh(originGeometry, originMaterial);
    scene.add(origin);

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

      // Dispose geometries
      xAxisGeometry.dispose();
      yAxisGeometry.dispose();
      zAxisGeometry.dispose();
      xArrowGeometry.dispose();
      yArrowGeometry.dispose();
      zArrowGeometry.dispose();
      originGeometry.dispose();

      // Dispose materials
      xAxisMaterial.dispose();
      yAxisMaterial.dispose();
      zAxisMaterial.dispose();
      xArrowMaterial.dispose();
      yArrowMaterial.dispose();
      zArrowMaterial.dispose();
      originMaterial.dispose();

      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
