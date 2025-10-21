import * as THREE from "three";

/**
 * Creates coordinate axes with arrows and labels
 * @param length Length of each axis
 * @returns Array of Three.js objects for axes, arrows, and labels
 */
export function createDebugAxes(length: number = 200) {
  const elements: THREE.Object3D[] = [];

  // X axis - Red
  const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(length, 0, 0),
  ]);
  const xAxisMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000,
    linewidth: 2,
  });
  const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
  xAxis.renderOrder = 0; // RGB axes on top of grid
  elements.push(xAxis);

  // Y axis - Green
  const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, length, 0),
  ]);
  const yAxisMaterial = new THREE.LineBasicMaterial({
    color: 0x00ff00,
    linewidth: 2,
  });
  const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
  yAxis.renderOrder = 0; // RGB axes on top of grid
  elements.push(yAxis);

  // Z axis - Blue
  const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, length),
  ]);
  const zAxisMaterial = new THREE.LineBasicMaterial({
    color: 0x0000ff,
    linewidth: 2,
  });
  const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);
  zAxis.renderOrder = 0; // RGB axes on top of grid
  elements.push(zAxis);

  // Arrow cones at the end of each axis
  const arrowLength = length * 0.1;
  const arrowRadius = length * 0.025;

  // X axis arrow (red)
  const xArrowGeometry = new THREE.ConeGeometry(arrowRadius, arrowLength, 8);
  const xArrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const xArrow = new THREE.Mesh(xArrowGeometry, xArrowMaterial);
  xArrow.position.set(length, 0, 0);
  xArrow.rotation.z = -Math.PI / 2;
  xArrow.renderOrder = 0; // RGB axes on top of grid
  elements.push(xArrow);

  // Y axis arrow (green)
  const yArrowGeometry = new THREE.ConeGeometry(arrowRadius, arrowLength, 8);
  const yArrowMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const yArrow = new THREE.Mesh(yArrowGeometry, yArrowMaterial);
  yArrow.position.set(0, length, 0);
  yArrow.rotation.set(0, 0, 0);
  yArrow.renderOrder = 0; // RGB axes on top of grid
  elements.push(yArrow);

  // Z axis arrow (blue)
  const zArrowGeometry = new THREE.ConeGeometry(arrowRadius, arrowLength, 8);
  const zArrowMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
  const zArrow = new THREE.Mesh(zArrowGeometry, zArrowMaterial);
  zArrow.position.set(0, 0, length);
  zArrow.rotation.x = Math.PI / 2;
  zArrow.renderOrder = 0; // RGB axes on top of grid
  elements.push(zArrow);

  return elements;
}

/**
 * Creates text sprite labels for axes
 * @param length Position offset for labels from origin
 * @returns Array of sprite objects for X, Y, Z labels
 */
export function createAxisLabels(length: number = 200) {
  const elements: THREE.Object3D[] = [];
  const labelOffset = length * 1.1;
  const scale = length * 0.1;

  const createTextSprite = (text: string, color: number) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.width = 128;
    canvas.height = 128;

    context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
    context.font = "Bold 64px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(scale, scale, 1);

    return sprite;
  };

  const xLabel = createTextSprite("X", 0xff0000);
  xLabel.position.set(labelOffset, 0, 0);
  elements.push(xLabel);

  const yLabel = createTextSprite("Y", 0x00ff00);
  yLabel.position.set(0, labelOffset, 0);
  elements.push(yLabel);

  const zLabel = createTextSprite("Z", 0x0000ff);
  zLabel.position.set(0, 0, labelOffset);
  elements.push(zLabel);

  return elements;
}

/**
 * Creates a grid helper on the XY plane (for Z-up coordinate system)
 * @param size Size of the grid
 * @param divisions Number of divisions
 * @returns GridHelper object
 */
export function createGridHelper(size: number = 400, divisions: number = 20) {
  const gridHelper = new THREE.GridHelper(size, divisions, 0x444444, 0x222222);
  // GridHelper is XZ by default, rotate to XY for Z-up
  gridHelper.rotation.x = Math.PI / 2;
  gridHelper.renderOrder = -1; // Render grid behind axes
  return gridHelper;
}

/**
 * Creates a scale-invariant origin marker using a sprite
 * The marker maintains a fixed pixel size regardless of zoom level
 * @param size Sprite size (default: 0.02 for 5px appearance)
 * @returns Sprite object for the origin marker
 */
export function createOriginMarker(size: number = 0.02) {
  // Create a small canvas for a crisp circle
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  canvas.width = 32;
  canvas.height = 32;

  // Draw black outline circle
  context.beginPath();
  context.arc(16, 16, 15, 0, 2 * Math.PI);
  context.fillStyle = "#000000";
  context.fill();

  // Draw white filled circle on top
  context.beginPath();
  context.arc(16, 16, 13, 0, 2 * Math.PI);
  context.fillStyle = "#ffffff";
  context.fill();

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    sizeAttenuation: false, // This makes it screen-space sized!
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(size, size, 1);
  sprite.position.set(0, 0, 0);
  sprite.renderOrder = 1; // Render after grid/axes but respect depth for scene objects

  return sprite;
}

/**
 * Creates a complete debug scene with axes, grid, and origin marker
 * @param axisLength Length of the coordinate axes
 * @param gridSize Size of the grid
 * @returns Array of all debug elements
 */
export function createDebugScene(
  axisLength: number = 200,
  gridSize: number = 400,
) {
  const elements: THREE.Object3D[] = [];

  // Add axes
  elements.push(...createDebugAxes(axisLength));

  // Add axis labels
  elements.push(...createAxisLabels(axisLength));

  // Add grid
  elements.push(createGridHelper(gridSize));

  // Add origin marker (scale-invariant)
  elements.push(createOriginMarker());

  return elements;
}

/**
 * Disposes of Three.js objects properly to prevent memory leaks
 * @param objects Array of objects to dispose
 */
export function disposeObjects(objects: THREE.Object3D[]) {
  objects.forEach((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      if (object.geometry) object.geometry.dispose();
      if (Array.isArray(object.material)) {
        object.material.forEach((mat) => mat.dispose());
      } else if (object.material) {
        object.material.dispose();
      }
    }
    if (object instanceof THREE.Sprite && object.material.map) {
      object.material.map.dispose();
      object.material.dispose();
    }
    if (object instanceof THREE.GridHelper) {
      object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    }
  });
}

/**
 * Setup camera with isometric perspective and Z-up coordinate system
 * @param camera The camera to configure
 * @param distance Distance from origin (default: 10)
 * @returns Configured camera
 */
export function setupIsometricCamera(
  camera: THREE.PerspectiveCamera,
  distance: number = 10,
) {
  // Isometric angle positions the camera at equal distances from all axes
  // Using (1, 1, 1) direction normalized and scaled by distance
  const factor = distance / Math.sqrt(3);
  camera.position.set(factor, factor, factor);
  camera.up.set(0, 0, 1); // Z is up
  camera.lookAt(0, 0, 0);
  return camera;
}

/**
 * Creates a camera with isometric perspective
 * @param width Canvas width
 * @param height Canvas height
 * @param distance Distance from origin (default: 10)
 * @param fov Field of view (default: 75)
 * @param near Near clipping plane (default: 0.1)
 * @param far Far clipping plane (default: 1000)
 * @returns Configured camera with isometric view
 */
export function createIsometricCamera(
  width: number,
  height: number,
  distance: number = 10,
  fov: number = 75,
  near: number = 0.1,
  far: number = 1000,
) {
  const camera = new THREE.PerspectiveCamera(fov, width / height, near, far);
  return setupIsometricCamera(camera, distance);
}

/**
 * Setup standard lighting for a scene
 * @param scene The scene to add lights to
 * @param type Type of lighting setup ('standard' | 'minimal' | 'bright')
 */
export function setupLighting(
  scene: THREE.Scene,
  type: "standard" | "minimal" | "bright" = "standard",
) {
  if (type === "minimal") {
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);
    return [ambientLight];
  }

  if (type === "bright") {
    const pointLight1 = new THREE.PointLight(0xffffff, 3, 0, 0);
    pointLight1.position.set(500, 500, 500);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 1, 0, 0);
    pointLight2.position.set(-500, -500, -500);
    scene.add(pointLight2);

    return [pointLight1, pointLight2];
  }

  // Standard lighting
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(0, 0, 1).normalize();
  scene.add(dirLight);

  const pointLight = new THREE.PointLight(0xffffff, 4.5);
  pointLight.position.set(0, 100, 90);
  scene.add(pointLight);

  const ambientLight = new THREE.AmbientLight(0x404040, 2);
  scene.add(ambientLight);

  return [dirLight, pointLight, ambientLight];
}
