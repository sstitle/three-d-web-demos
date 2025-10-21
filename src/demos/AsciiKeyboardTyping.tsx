import { useEffect, useState, useRef } from "react";
import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { AsciiEffect } from "three/examples/jsm/effects/AsciiEffect.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useKeyboardInput } from "../hooks/useKeyboardInput";
import { useDebugScene } from "../hooks/useDebugScene";
import { createIsometricCamera } from "../utils/threeHelpers";
import DebugOverlay, { DebugText, DebugButton } from "../components/DebugOverlay";

export default function AsciiKeyboardTyping() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const { currentChar } = useKeyboardInput();
  const [fontLoaded, setFontLoaded] = useState(false);
  const fontRef = useRef<any>(null);
  const { debugEnabled, toggleDebug } = useDebugScene(sceneRef.current);

  // Load font
  useEffect(() => {
    const loader = new FontLoader();
    loader.load(
      "https://threejs.org/examples/fonts/helvetiker_bold.typeface.json",
      (font) => {
        fontRef.current = font;
        setFontLoaded(true);
      },
    );
  }, []);

  // Main Three.js setup
  useEffect(() => {
    if (!containerRef.current || !fontRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Camera - Isometric view with Z-up
    const camera = createIsometricCamera(width, height, 1000, 30, 1, 10000);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);

    // ASCII Effect - use current character as primary character in shader
    const asciiChars = currentChar + " .:-+*=%@#";
    const effect = new AsciiEffect(renderer, asciiChars, { invert: true });
    effect.setSize(width, height);
    effect.domElement.style.color = "white";
    effect.domElement.style.backgroundColor = "black";
    container.appendChild(effect.domElement);

    // Lights (adjusted for Z-up)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(0, 1, 1).normalize();
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xffffff, 4.5);
    pointLight.position.set(0, 90, 100);
    scene.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    // Controls
    const controls = new OrbitControls(camera, effect.domElement);
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
        textGeometry.translate(
          -centerOffset.x,
          -centerOffset.y,
          -centerOffset.z,
        );
      }

      const materials = [
        new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true }),
        new THREE.MeshPhongMaterial({ color: 0x667eea }),
      ];

      const mesh = new THREE.Mesh(textGeometry, materials);
      // Rotate text to stand upright in Z-up coordinate system
      // Text is created in XY plane, rotate 90 degrees around X to make it face up
      mesh.rotation.x = Math.PI / 2;
      return mesh;
    };

    // Initial text
    let textMesh = createText(currentChar);
    scene.add(textMesh);

    // Update text mesh when character changes
    const updateTextMesh = (char: string) => {
      // Remove old text
      scene.remove(textMesh);
      textMesh.geometry.dispose();

      // Add new text
      textMesh = createText(char);
      scene.add(textMesh);
    };

    // Initial setup with current character
    if (currentChar !== "A") {
      updateTextMesh(currentChar);
    }

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();

      if (textMesh) {
        // Rotate around Y axis (which becomes vertical after the X rotation)
        textMesh.rotation.y += 0.01;
        // Keep base X rotation and add wobble
        textMesh.rotation.x = Math.PI / 2 + Math.sin(Date.now() * 0.001) * 0.1;
      }

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
      scene.remove(textMesh);
      textMesh.geometry.dispose();
      container.removeChild(effect.domElement);
      sceneRef.current = null;
    };
  }, [fontLoaded, currentChar]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <DebugOverlay>
        {!fontLoaded ? (
          <div>Loading font...</div>
        ) : (
          <div>
            <div>Type any key!</div>
            <DebugText secondary>Current: {currentChar}</DebugText>
            <DebugButton onClick={toggleDebug} active={debugEnabled}>
              {debugEnabled ? "Hide Debug" : "Show Debug"}
            </DebugButton>
          </div>
        )}
      </DebugOverlay>
    </div>
  );
}
