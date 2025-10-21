import { useState, useEffect } from "react";
import * as THREE from "three";
import { createDebugScene, disposeObjects } from "../utils/threeHelpers";

interface UseDebugSceneOptions {
  /** Length of the coordinate axes */
  axisLength?: number;
  /** Size of the grid */
  gridSize?: number;
  /** Initial debug mode state */
  initialEnabled?: boolean;
}

/**
 * Custom hook for managing debug scene elements (axes, grid, labels)
 * @param scene The Three.js scene to add debug elements to
 * @param options Configuration options
 * @returns Object with debugEnabled state and toggle function
 */
export function useDebugScene(
  scene: THREE.Scene | null,
  options: UseDebugSceneOptions = {},
) {
  const {
    axisLength = 200,
    gridSize = 400,
    initialEnabled = false,
  } = options;

  const [debugEnabled, setDebugEnabled] = useState(initialEnabled);
  const [debugElements, setDebugElements] = useState<THREE.Object3D[]>([]);

  useEffect(() => {
    if (!scene) return;

    if (debugEnabled) {
      // Create and add debug elements
      const elements = createDebugScene(axisLength, gridSize);
      elements.forEach((element) => scene.add(element));
      setDebugElements(elements);
    } else {
      // Remove and dispose debug elements
      if (debugElements.length > 0) {
        debugElements.forEach((element) => scene.remove(element));
        disposeObjects(debugElements);
        setDebugElements([]);
      }
    }

    // Cleanup on unmount
    return () => {
      if (debugElements.length > 0) {
        debugElements.forEach((element) => scene.remove(element));
        disposeObjects(debugElements);
      }
    };
  }, [debugEnabled, scene]);

  const toggleDebug = () => setDebugEnabled((prev) => !prev);

  return {
    debugEnabled,
    toggleDebug,
    setDebugEnabled,
  };
}
