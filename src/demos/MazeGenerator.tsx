import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import DebugOverlay, { DebugText, DebugButton } from '../components/DebugOverlay';
import { createIsometricCamera } from '../utils/threeHelpers';

interface Cell {
  x: number;
  y: number;
  walls: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
  };
  visited: boolean;
}

type MazeGrid = Cell[][];

const CELL_SIZE = 2;
const WALL_HEIGHT_3D = 3;
const WALL_THICKNESS = 0.2;

export default function MazeGenerator() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const mazeGroupRef = useRef<THREE.Group | null>(null);

  const [seed, setSeed] = useState(12345);
  const [gridSize, setGridSize] = useState(16);
  const [is3D, setIs3D] = useState(true);
  const [showSolution, setShowSolution] = useState(false);
  const [maze, setMaze] = useState<MazeGrid | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [endPos, setEndPos] = useState({ x: 0, y: 0 });
  const [solutionPath, setSolutionPath] = useState<Array<{ x: number; y: number }>>([]);
  const [stats, setStats] = useState({ deadEnds: 0, pathLength: 0 });

  // Seeded random number generator (Alea algorithm)
  const createSeededRandom = (seed: number) => {
    let s = seed;
    return () => {
      s = Math.imul(s ^ (s >>> 16), 0x85ebca6b);
      s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35);
      return ((s ^ (s >>> 16)) >>> 0) / 2 ** 32;
    };
  };

  // Generate maze using Recursive Backtracking
  const generateMaze = (size: number, seedValue: number) => {
    const random = createSeededRandom(seedValue);

    // Initialize grid
    const grid: MazeGrid = [];
    for (let y = 0; y < size; y++) {
      grid[y] = [];
      for (let x = 0; x < size; x++) {
        grid[y][x] = {
          x,
          y,
          walls: { north: true, south: true, east: true, west: true },
          visited: false,
        };
      }
    }

    // Derive start and end positions from seed
    const startX = Math.floor(random() * size);
    const startY = Math.floor(random() * size);
    const endX = Math.floor(random() * size);
    const endY = Math.floor(random() * size);

    // Recursive backtracking algorithm
    const stack: Cell[] = [];
    const startCell = grid[startY][startX];
    startCell.visited = true;
    stack.push(startCell);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = getUnvisitedNeighbors(current, grid, size);

      if (neighbors.length > 0) {
        // Choose random unvisited neighbor
        const next = neighbors[Math.floor(random() * neighbors.length)];

        // Remove wall between current and next
        removeWall(current, next);

        next.visited = true;
        stack.push(next);
      } else {
        stack.pop();
      }
    }

    // Calculate stats
    const deadEnds = countDeadEnds(grid, size);
    const path = findPath(grid, startX, startY, endX, endY);

    setMaze(grid);
    setStartPos({ x: startX, y: startY });
    setEndPos({ x: endX, y: endY });
    setSolutionPath(path);
    setStats({ deadEnds, pathLength: path.length });
  };

  const getUnvisitedNeighbors = (cell: Cell, grid: MazeGrid, size: number): Cell[] => {
    const neighbors: Cell[] = [];
    const { x, y } = cell;

    if (y > 0 && !grid[y - 1][x].visited) neighbors.push(grid[y - 1][x]); // North
    if (y < size - 1 && !grid[y + 1][x].visited) neighbors.push(grid[y + 1][x]); // South
    if (x < size - 1 && !grid[y][x + 1].visited) neighbors.push(grid[y][x + 1]); // East
    if (x > 0 && !grid[y][x - 1].visited) neighbors.push(grid[y][x - 1]); // West

    return neighbors;
  };

  const removeWall = (current: Cell, next: Cell) => {
    const dx = next.x - current.x;
    const dy = next.y - current.y;

    if (dx === 1) {
      current.walls.east = false;
      next.walls.west = false;
    } else if (dx === -1) {
      current.walls.west = false;
      next.walls.east = false;
    } else if (dy === 1) {
      current.walls.south = false;
      next.walls.north = false;
    } else if (dy === -1) {
      current.walls.north = false;
      next.walls.south = false;
    }
  };

  const countDeadEnds = (grid: MazeGrid, size: number): number => {
    let count = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = grid[y][x];
        const wallCount = [cell.walls.north, cell.walls.south, cell.walls.east, cell.walls.west]
          .filter(w => w).length;
        if (wallCount === 3) count++;
      }
    }
    return count;
  };

  const findPath = (grid: MazeGrid, startX: number, startY: number, endX: number, endY: number): Array<{ x: number; y: number }> => {
    // BFS to find shortest path
    const queue: Array<{ x: number; y: number; dist: number }> = [{ x: startX, y: startY, dist: 0 }];
    const visited = new Map<string, { x: number; y: number } | null>();
    visited.set(`${startX},${startY}`, null);

    while (queue.length > 0) {
      const { x, y, dist } = queue.shift()!;

      if (x === endX && y === endY) {
        // Reconstruct path
        const path: Array<{ x: number; y: number }> = [];
        let current: { x: number; y: number } | null = { x, y };

        while (current !== null) {
          path.unshift(current);
          const key: string = `${current.x},${current.y}`;
          current = visited.get(key) || null;
        }

        return path;
      }

      const cell = grid[y][x];

      // Check all four directions
      if (!cell.walls.north && y > 0) {
        const key = `${x},${y - 1}`;
        if (!visited.has(key)) {
          visited.set(key, { x, y });
          queue.push({ x, y: y - 1, dist: dist + 1 });
        }
      }
      if (!cell.walls.south && y < grid.length - 1) {
        const key = `${x},${y + 1}`;
        if (!visited.has(key)) {
          visited.set(key, { x, y });
          queue.push({ x, y: y + 1, dist: dist + 1 });
        }
      }
      if (!cell.walls.east && x < grid[0].length - 1) {
        const key = `${x + 1},${y}`;
        if (!visited.has(key)) {
          visited.set(key, { x, y });
          queue.push({ x: x + 1, y, dist: dist + 1 });
        }
      }
      if (!cell.walls.west && x > 0) {
        const key = `${x - 1},${y}`;
        if (!visited.has(key)) {
          visited.set(key, { x, y });
          queue.push({ x: x - 1, y, dist: dist + 1 });
        }
      }
    }

    return []; // No path found
  };

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // Camera
    const camera = createIsometricCamera(width, height, gridSize * CELL_SIZE);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 200;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 20, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x4444ff, 0.3);
    fillLight.position.set(-10, -10, 10);
    scene.add(fillLight);

    // Create maze group
    const mazeGroup = new THREE.Group();
    scene.add(mazeGroup);
    mazeGroupRef.current = mazeGroup;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      const newWidth = entry.contentRect.width;
      const newHeight = entry.contentRect.height;

      if (cameraRef.current) {
        cameraRef.current.aspect = newWidth / newHeight;
        cameraRef.current.updateProjectionMatrix();
      }

      renderer.setSize(newWidth, newHeight);
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update camera distance when grid size changes
  useEffect(() => {
    if (cameraRef.current && controlsRef.current) {
      const distance = gridSize * CELL_SIZE * 1.2;
      const factor = distance / Math.sqrt(3);
      cameraRef.current.position.set(factor, factor, factor);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [gridSize]);

  // Generate maze when seed or gridSize changes
  useEffect(() => {
    generateMaze(gridSize, seed);
  }, [seed, gridSize]);

  // Render maze in Three.js
  useEffect(() => {
    if (!maze || !mazeGroupRef.current) return;

    const mazeGroup = mazeGroupRef.current;

    // Clear previous maze
    while (mazeGroup.children.length > 0) {
      const child = mazeGroup.children[0];
      mazeGroup.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    const size = maze.length;
    const offset = (size * CELL_SIZE) / 2;

    if (is3D) {
      render3DMaze(maze, mazeGroup, offset);
    } else {
      render2DMaze(maze, mazeGroup, offset);
    }

    // Render solution path if enabled
    if (showSolution && solutionPath.length > 0) {
      renderSolutionPath(mazeGroup, offset);
    }
  }, [maze, is3D, showSolution, solutionPath]);

  const render3DMaze = (grid: MazeGrid, group: THREE.Group, offset: number) => {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a5e,
      roughness: 0.7,
      metalness: 0.3,
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      roughness: 0.9,
      metalness: 0.1,
    });

    const startMaterial = new THREE.MeshStandardMaterial({
      color: 0x44ff44,
      emissive: 0x44ff44,
      emissiveIntensity: 0.3,
    });

    const endMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4444,
      emissive: 0xff4444,
      emissiveIntensity: 0.3,
    });

    // Floor tiles
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const isStart = x === startPos.x && y === startPos.y;
        const isEnd = x === endPos.x && y === endPos.y;

        const floorGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.9, CELL_SIZE * 0.9, 0.2);
        const material = isStart ? startMaterial : isEnd ? endMaterial : floorMaterial;
        const floor = new THREE.Mesh(floorGeometry, material);
        floor.position.set(
          x * CELL_SIZE - offset + CELL_SIZE / 2,
          y * CELL_SIZE - offset + CELL_SIZE / 2,
          0
        );
        floor.castShadow = false;
        floor.receiveShadow = true;
        group.add(floor);
      }
    }

    // Walls
    const wallGeometry = new THREE.BoxGeometry(CELL_SIZE, WALL_THICKNESS, WALL_HEIGHT_3D);
    const wallGeometryVertical = new THREE.BoxGeometry(WALL_THICKNESS, CELL_SIZE, WALL_HEIGHT_3D);

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const cell = grid[y][x];
        const posX = x * CELL_SIZE - offset + CELL_SIZE / 2;
        const posY = y * CELL_SIZE - offset + CELL_SIZE / 2;

        // North wall
        if (cell.walls.north) {
          const wall = new THREE.Mesh(wallGeometry, wallMaterial);
          wall.position.set(posX, posY - CELL_SIZE / 2, WALL_HEIGHT_3D / 2);
          wall.castShadow = true;
          wall.receiveShadow = true;
          group.add(wall);
        }

        // South wall
        if (cell.walls.south) {
          const wall = new THREE.Mesh(wallGeometry, wallMaterial);
          wall.position.set(posX, posY + CELL_SIZE / 2, WALL_HEIGHT_3D / 2);
          wall.castShadow = true;
          wall.receiveShadow = true;
          group.add(wall);
        }

        // East wall
        if (cell.walls.east) {
          const wall = new THREE.Mesh(wallGeometryVertical, wallMaterial);
          wall.position.set(posX + CELL_SIZE / 2, posY, WALL_HEIGHT_3D / 2);
          wall.castShadow = true;
          wall.receiveShadow = true;
          group.add(wall);
        }

        // West wall
        if (cell.walls.west) {
          const wall = new THREE.Mesh(wallGeometryVertical, wallMaterial);
          wall.position.set(posX - CELL_SIZE / 2, posY, WALL_HEIGHT_3D / 2);
          wall.castShadow = true;
          wall.receiveShadow = true;
          group.add(wall);
        }
      }
    }
  };

  const render2DMaze = (grid: MazeGrid, group: THREE.Group, offset: number) => {
    const pathMaterial = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });
    const startMaterial = new THREE.MeshBasicMaterial({ color: 0x44ff44 });
    const endMaterial = new THREE.MeshBasicMaterial({ color: 0xff4444 });

    // Background (full grid area)
    const backgroundGeometry = new THREE.PlaneGeometry(
      grid.length * CELL_SIZE,
      grid[0].length * CELL_SIZE
    );
    const backgroundMaterial = new THREE.MeshBasicMaterial({ color: 0x2a2a3e });
    const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    background.position.set(0, 0, -0.1);
    group.add(background);

    // Path tiles (only walkable cells)
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const isStart = x === startPos.x && y === startPos.y;
        const isEnd = x === endPos.x && y === endPos.y;

        const floorGeometry = new THREE.PlaneGeometry(CELL_SIZE * 0.85, CELL_SIZE * 0.85);
        const material = isStart ? startMaterial : isEnd ? endMaterial : pathMaterial;
        const floor = new THREE.Mesh(floorGeometry, material);
        floor.position.set(
          x * CELL_SIZE - offset + CELL_SIZE / 2,
          y * CELL_SIZE - offset + CELL_SIZE / 2,
          0
        );
        group.add(floor);
      }
    }

    // Walls (thick dark lines)
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
    const wallThickness = 0.25;
    const wallGeometry = new THREE.PlaneGeometry(CELL_SIZE + wallThickness, wallThickness);
    const wallGeometryVertical = new THREE.PlaneGeometry(wallThickness, CELL_SIZE + wallThickness);

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const cell = grid[y][x];
        const posX = x * CELL_SIZE - offset + CELL_SIZE / 2;
        const posY = y * CELL_SIZE - offset + CELL_SIZE / 2;

        // North wall
        if (cell.walls.north) {
          const wall = new THREE.Mesh(wallGeometry, wallMaterial);
          wall.position.set(posX, posY - CELL_SIZE / 2, 0.1);
          group.add(wall);
        }

        // South wall
        if (cell.walls.south) {
          const wall = new THREE.Mesh(wallGeometry, wallMaterial);
          wall.position.set(posX, posY + CELL_SIZE / 2, 0.1);
          group.add(wall);
        }

        // East wall
        if (cell.walls.east) {
          const wall = new THREE.Mesh(wallGeometryVertical, wallMaterial);
          wall.position.set(posX + CELL_SIZE / 2, posY, 0.1);
          group.add(wall);
        }

        // West wall
        if (cell.walls.west) {
          const wall = new THREE.Mesh(wallGeometryVertical, wallMaterial);
          wall.position.set(posX - CELL_SIZE / 2, posY, 0.1);
          group.add(wall);
        }
      }
    }
  };

  const renderSolutionPath = (group: THREE.Group, offset: number) => {
    if (solutionPath.length < 2) return;

    // Create gradient line from start (green) to end (red)
    const points: THREE.Vector3[] = [];
    const colors: number[] = [];

    for (let i = 0; i < solutionPath.length; i++) {
      const { x, y } = solutionPath[i];
      const posX = x * CELL_SIZE - offset + CELL_SIZE / 2;
      const posY = y * CELL_SIZE - offset + CELL_SIZE / 2;
      const posZ = is3D ? 0.3 : 0.2; // Float above floor

      points.push(new THREE.Vector3(posX, posY, posZ));

      // Gradient from green (start) to yellow (middle) to red (end)
      const t = i / (solutionPath.length - 1);

      if (t < 0.5) {
        // Green to Yellow (0 to 0.5)
        const localT = t * 2;
        colors.push(
          0.27 + localT * (1 - 0.27), // R: 0.27 -> 1.0
          1.0,                         // G: 1.0 -> 1.0
          0.27 * (1 - localT)         // B: 0.27 -> 0
        );
      } else {
        // Yellow to Red (0.5 to 1.0)
        const localT = (t - 0.5) * 2;
        colors.push(
          1.0,                         // R: 1.0 -> 1.0
          1.0 * (1 - localT),         // G: 1.0 -> 0
          0                            // B: 0 -> 0
        );
      }
    }

    // Create line geometry
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 3,
      opacity: 0.8,
      transparent: true,
    });

    const line = new THREE.Line(geometry, material);
    group.add(line);

    // Add glowing spheres at path points for extra visibility
    if (is3D) {
      const sphereGeometry = new THREE.SphereGeometry(0.15, 8, 8);

      for (let i = 0; i < solutionPath.length; i++) {
        const { x, y } = solutionPath[i];
        const posX = x * CELL_SIZE - offset + CELL_SIZE / 2;
        const posY = y * CELL_SIZE - offset + CELL_SIZE / 2;

        const t = i / (solutionPath.length - 1);
        let color: number;

        if (t < 0.5) {
          color = 0xffff00; // Yellow
        } else {
          color = 0xff8800; // Orange
        }

        const sphereMaterial = new THREE.MeshBasicMaterial({
          color,
          opacity: 0.6,
          transparent: true,
        });

        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(posX, posY, 0.3);
        group.add(sphere);
      }
    }
  };

  const handleRandomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000));
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#000' }} />
      <DebugOverlay position="top-left">
        <div>Maze Generator</div>
        <DebugText secondary style={{ marginTop: '8px' }}>
          Algorithm: Recursive Backtracking
        </DebugText>
        <DebugText secondary>
          Grid: {gridSize}×{gridSize}
        </DebugText>
        <DebugText secondary>
          Dead Ends: {stats.deadEnds}
        </DebugText>
        <DebugText secondary>
          Path Length: {stats.pathLength}
        </DebugText>

        <div style={{ marginTop: '1rem' }}>
          <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Seed:
          </label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
              style={{
                flex: 1,
                padding: '4px',
                fontSize: '11px',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1px solid #666',
                borderRadius: '4px',
              }}
            />
            <button
              onClick={handleRandomizeSeed}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1px solid #666',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              🎲
            </button>
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Grid Size:
          </label>
          <select
            value={gridSize}
            onChange={(e) => setGridSize(parseInt(e.target.value))}
            style={{
              width: '100%',
              padding: '4px',
              fontSize: '11px',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid #666',
              borderRadius: '4px',
            }}
          >
            <option value="8">8×8 (Tiny)</option>
            <option value="16">16×16 (Small)</option>
            <option value="32">32×32 (Medium)</option>
            <option value="48">48×48 (Large)</option>
          </select>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <DebugButton active={is3D} onClick={() => setIs3D(!is3D)}>
            {is3D ? '3D View' : '2D View'}
          </DebugButton>
          <DebugButton active={showSolution} onClick={() => setShowSolution(!showSolution)}>
            {showSolution ? 'Hide Solution' : 'Show Solution'}
          </DebugButton>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '11px', opacity: 0.6, lineHeight: '1.4' }}>
          🟢 Start • 🔴 End
          <br />
          Solution: Green → Yellow → Red
          <br />
          🎮 Drag to orbit • Scroll to zoom
        </div>
      </DebugOverlay>
    </div>
  );
}
