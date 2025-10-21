import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";

interface UseThreeSceneOptions {
  /** Background color for the scene */
  backgroundColor?: THREE.ColorRepresentation;
  /** Camera field of view */
  fov?: number;
  /** Camera near clipping plane */
  near?: number;
  /** Camera far clipping plane */
  far?: number;
  /** Initial camera position */
  cameraPosition?: [number, number, number];
  /** Camera look-at target */
  cameraTarget?: [number, number, number];
  /** Enable antialiasing on the renderer */
  antialias?: boolean;
}

interface ThreeSceneRefs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  container: HTMLDivElement;
}

/**
 * Custom hook for setting up a Three.js scene with automatic cleanup
 * @param containerRef Reference to the container div element
 * @param options Configuration options for the scene
 * @returns Refs to scene, camera, and renderer (or null if not initialized)
 */
export function useThreeScene(
  containerRef: MutableRefObject<HTMLDivElement | null>,
  options: UseThreeSceneOptions = {},
): MutableRefObject<ThreeSceneRefs | null> {
  const {
    backgroundColor = 0x000000,
    fov = 75,
    near = 0.1,
    far = 1000,
    cameraPosition = [0, 0, 5],
    cameraTarget = [0, 0, 0],
    antialias = true,
  } = options;

  const sceneRef = useRef<ThreeSceneRefs | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);

    // Create camera
    const camera = new THREE.PerspectiveCamera(fov, width / height, near, far);
    camera.position.set(...cameraPosition);
    camera.lookAt(...cameraTarget);

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Store refs
    sceneRef.current = { scene, camera, renderer, container };

    // Setup resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (!sceneRef.current) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      sceneRef.current.camera.aspect = newWidth / newHeight;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(newWidth, newHeight);
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      if (sceneRef.current) {
        sceneRef.current.renderer.dispose();
        container.removeChild(sceneRef.current.renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, [
    containerRef,
    backgroundColor,
    fov,
    near,
    far,
    ...cameraPosition,
    ...cameraTarget,
    antialias,
  ]);

  return sceneRef;
}

/**
 * Hook for managing animation loop
 * @param animate Animation callback function
 * @param dependencies Array of dependencies that should restart the animation loop
 */
export function useAnimationLoop(
  animate: (time: number) => void,
  dependencies: any[] = [],
) {
  useEffect(() => {
    let animationId: number;
    let startTime = Date.now();

    const loop = () => {
      const currentTime = Date.now() - startTime;
      animate(currentTime);
      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, dependencies);
}
