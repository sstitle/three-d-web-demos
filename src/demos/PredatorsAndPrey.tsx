import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import DebugOverlay, { DebugText, DebugButton } from '../components/DebugOverlay';

interface Actor {
  position: THREE.Vector2;
  velocity: THREE.Vector2;
  heading: number; // Direction in radians
  mesh: THREE.Group;
  alive: boolean;
}

interface Predator extends Actor {
  type: 'predator';
}

interface Prey extends Actor {
  type: 'prey';
}

const WORLD_SIZE = 50;
const PREDATOR_SIZE = 2;
const PREY_SIZE = 1;
const PREDATOR_SPEED = 0.15;
const PREY_SPEED = 0.08;
const PREDATOR_TURN_RATE = 0.03;
const PREY_TURN_RATE = 0.08;
const DETECTION_RANGE = 15;
const COLLISION_DISTANCE_PREDATOR = PREDATOR_SIZE;
const COLLISION_DISTANCE_PREY = PREY_SIZE;

export default function PredatorsAndPrey() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const predatorsRef = useRef<Predator[]>([]);
  const preyRef = useRef<Prey[]>([]);
  const animationFrameRef = useRef<number>(0);
  const isPausedRef = useRef(false);

  const [stats, setStats] = useState({ predators: 0, prey: 0, eaten: 0 });
  const [isPaused, setIsPaused] = useState(false);

  // Initialize scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // Camera - Orthographic top-down view
    const aspect = width / height;
    const viewSize = WORLD_SIZE * 1.2;
    const camera = new THREE.OrthographicCamera(
      -viewSize * aspect / 2,
      viewSize * aspect / 2,
      viewSize / 2,
      -viewSize / 2,
      0.1,
      100
    );
    camera.position.set(0, 0, 50);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ground plane (reference)
    const groundGeometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE);
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: 0x0f1419,
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    scene.add(ground);

    // World boundary
    const boundaryGeometry = new THREE.EdgesGeometry(groundGeometry);
    const boundaryMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
    const boundary = new THREE.LineSegments(boundaryGeometry, boundaryMaterial);
    boundary.position.z = 0.1;
    scene.add(boundary);

    // Create initial actors
    initializeActors(scene);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (!isPausedRef.current) {
        updateSimulation();
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      const newWidth = entry.contentRect.width;
      const newHeight = entry.contentRect.height;
      const newAspect = newWidth / newHeight;

      if (cameraRef.current) {
        cameraRef.current.left = -viewSize * newAspect / 2;
        cameraRef.current.right = viewSize * newAspect / 2;
        cameraRef.current.top = viewSize / 2;
        cameraRef.current.bottom = -viewSize / 2;
        cameraRef.current.updateProjectionMatrix();
      }

      renderer.setSize(newWidth, newHeight);
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();

      // Dispose all meshes
      predatorsRef.current.forEach(p => {
        scene.remove(p.mesh);
        p.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      });
      preyRef.current.forEach(p => {
        scene.remove(p.mesh);
        p.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      });

      groundGeometry.dispose();
      groundMaterial.dispose();
      boundaryGeometry.dispose();
      boundaryMaterial.dispose();
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync pause state with ref
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const initializeActors = (scene: THREE.Scene, numPredators = 5, numPrey = 30) => {
    // Clear existing actors
    predatorsRef.current.forEach(p => {
      scene.remove(p.mesh);
      p.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    preyRef.current.forEach(p => {
      scene.remove(p.mesh);
      p.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });

    predatorsRef.current = [];
    preyRef.current = [];

    // Create predators
    for (let i = 0; i < numPredators; i++) {
      const predator = createPredator();
      predatorsRef.current.push(predator);
      scene.add(predator.mesh);
    }

    // Create prey
    for (let i = 0; i < numPrey; i++) {
      const prey = createPrey();
      preyRef.current.push(prey);
      scene.add(prey.mesh);
    }

    updateStats();
  };

  const createPredator = (): Predator => {
    const position = new THREE.Vector2(
      (Math.random() - 0.5) * WORLD_SIZE * 0.8,
      (Math.random() - 0.5) * WORLD_SIZE * 0.8
    );
    const heading = Math.random() * Math.PI * 2;
    const velocity = new THREE.Vector2(
      Math.cos(heading) * PREDATOR_SPEED,
      Math.sin(heading) * PREDATOR_SPEED
    );

    // Create mesh - box with direction indicator
    const group = new THREE.Group();

    // Body (square)
    const bodyGeometry = new THREE.PlaneGeometry(PREDATOR_SIZE, PREDATOR_SIZE);
    const bodyMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      side: THREE.DoubleSide,
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(bodyMesh);

    // Direction indicator (triangle pointing forward)
    const directionGeometry = new THREE.BufferGeometry();
    const directionVertices = new Float32Array([
      PREDATOR_SIZE * 0.6, 0, 0.01,
      PREDATOR_SIZE * 0.2, PREDATOR_SIZE * 0.3, 0.01,
      PREDATOR_SIZE * 0.2, -PREDATOR_SIZE * 0.3, 0.01,
    ]);
    directionGeometry.setAttribute('position', new THREE.BufferAttribute(directionVertices, 3));
    const directionMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaaaa,
      side: THREE.DoubleSide,
    });
    const directionMesh = new THREE.Mesh(directionGeometry, directionMaterial);
    group.add(directionMesh);

    // Collision box outline
    const edgesGeometry = new THREE.EdgesGeometry(bodyGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    edges.position.z = 0.02;
    group.add(edges);

    group.position.set(position.x, position.y, 1);
    group.rotation.z = heading;

    return {
      type: 'predator',
      position,
      velocity,
      heading,
      mesh: group,
      alive: true,
    };
  };

  const createPrey = (): Prey => {
    const position = new THREE.Vector2(
      (Math.random() - 0.5) * WORLD_SIZE * 0.8,
      (Math.random() - 0.5) * WORLD_SIZE * 0.8
    );
    const heading = Math.random() * Math.PI * 2;
    const velocity = new THREE.Vector2(
      Math.cos(heading) * PREY_SPEED,
      Math.sin(heading) * PREY_SPEED
    );

    // Create mesh - smaller box with direction indicator
    const group = new THREE.Group();

    // Body (circle approximated with octagon)
    const bodyGeometry = new THREE.CircleGeometry(PREY_SIZE / 2, 8);
    const bodyMaterial = new THREE.MeshBasicMaterial({
      color: 0x44ff44,
      side: THREE.DoubleSide,
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(bodyMesh);

    // Direction indicator (small triangle)
    const directionGeometry = new THREE.BufferGeometry();
    const directionVertices = new Float32Array([
      PREY_SIZE * 0.6, 0, 0.01,
      PREY_SIZE * 0.2, PREY_SIZE * 0.2, 0.01,
      PREY_SIZE * 0.2, -PREY_SIZE * 0.2, 0.01,
    ]);
    directionGeometry.setAttribute('position', new THREE.BufferAttribute(directionVertices, 3));
    const directionMaterial = new THREE.MeshBasicMaterial({
      color: 0xaaffaa,
      side: THREE.DoubleSide,
    });
    const directionMesh = new THREE.Mesh(directionGeometry, directionMaterial);
    group.add(directionMesh);

    // Collision box outline
    const edgesGeometry = new THREE.EdgesGeometry(bodyGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1 });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    edges.position.z = 0.02;
    group.add(edges);

    group.position.set(position.x, position.y, 0.5);
    group.rotation.z = heading;

    return {
      type: 'prey',
      position,
      velocity,
      heading,
      mesh: group,
      alive: true,
    };
  };

  const updateSimulation = () => {
    const predators = predatorsRef.current;
    const allPrey = preyRef.current;
    const prey = allPrey.filter(p => p.alive);

    // Update predators
    predators.forEach(predator => {
      // Find nearest prey
      let nearestPrey: Prey | null = null;
      let nearestDistance = DETECTION_RANGE;

      prey.forEach(p => {
        const distance = predator.position.distanceTo(p.position);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPrey = p;
        }
      });

      // Steer towards nearest prey
      if (nearestPrey !== null) {
        const targetPrey = nearestPrey as Prey;
        const desiredHeading = Math.atan2(
          targetPrey.position.y - predator.position.y,
          targetPrey.position.x - predator.position.x
        );
        predator.heading = turnTowards(predator.heading, desiredHeading, PREDATOR_TURN_RATE);
      }

      // Update velocity based on heading
      predator.velocity.x = Math.cos(predator.heading) * PREDATOR_SPEED;
      predator.velocity.y = Math.sin(predator.heading) * PREDATOR_SPEED;

      // Update position
      predator.position.add(predator.velocity);

      // Wrap around world boundaries
      wrapPosition(predator.position);

      // Update mesh
      predator.mesh.position.set(predator.position.x, predator.position.y, 1);
      predator.mesh.rotation.z = predator.heading;
    });

    // Update prey
    let eatenCount = 0;
    prey.forEach(preyActor => {
      if (!preyActor.alive) return;

      // Find nearest predator
      let nearestPredator: Predator | null = null;
      let nearestDistance = DETECTION_RANGE;

      predators.forEach(predator => {
        const distance = preyActor.position.distanceTo(predator.position);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPredator = predator;
        }
      });

      // Steer away from nearest predator
      if (nearestPredator !== null) {
        const targetPredator = nearestPredator as Predator;
        const fleeHeading = Math.atan2(
          preyActor.position.y - targetPredator.position.y,
          preyActor.position.x - targetPredator.position.x
        );
        preyActor.heading = turnTowards(preyActor.heading, fleeHeading, PREY_TURN_RATE);
      }

      // Update velocity based on heading
      preyActor.velocity.x = Math.cos(preyActor.heading) * PREY_SPEED;
      preyActor.velocity.y = Math.sin(preyActor.heading) * PREY_SPEED;

      // Update position
      preyActor.position.add(preyActor.velocity);

      // Wrap around world boundaries
      wrapPosition(preyActor.position);

      // Check collision with predators
      predators.forEach(predator => {
        const distance = preyActor.position.distanceTo(predator.position);
        if (distance < (COLLISION_DISTANCE_PREDATOR + COLLISION_DISTANCE_PREY) / 2) {
          preyActor.alive = false;
          eatenCount++;

          // Remove mesh from scene
          if (sceneRef.current) {
            sceneRef.current.remove(preyActor.mesh);
          }
        }
      });

      // Update mesh if still alive
      if (preyActor.alive) {
        preyActor.mesh.position.set(preyActor.position.x, preyActor.position.y, 0.5);
        preyActor.mesh.rotation.z = preyActor.heading;
      }
    });

    // Update stats
    if (eatenCount > 0) {
      updateStats(eatenCount);
    }
  };

  const turnTowards = (currentHeading: number, desiredHeading: number, turnRate: number): number => {
    // Normalize angles to [-PI, PI]
    let diff = desiredHeading - currentHeading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    // Turn towards desired heading at turn rate
    if (Math.abs(diff) < turnRate) {
      return desiredHeading;
    } else {
      return currentHeading + Math.sign(diff) * turnRate;
    }
  };

  const wrapPosition = (position: THREE.Vector2) => {
    const halfWorld = WORLD_SIZE / 2;
    if (position.x > halfWorld) position.x = -halfWorld;
    if (position.x < -halfWorld) position.x = halfWorld;
    if (position.y > halfWorld) position.y = -halfWorld;
    if (position.y < -halfWorld) position.y = halfWorld;
  };

  const updateStats = (additionalEaten = 0) => {
    const alivePrey = preyRef.current.filter(p => p.alive).length;
    setStats(prev => ({
      predators: predatorsRef.current.length,
      prey: alivePrey,
      eaten: prev.eaten + additionalEaten,
    }));
  };

  const handleReset = () => {
    if (sceneRef.current) {
      initializeActors(sceneRef.current, 5, 30);
      setStats({ predators: 5, prey: 30, eaten: 0 });
    }
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#000' }} />
      <DebugOverlay position="top-left">
        <div>Predators and Prey</div>
        <DebugText secondary style={{ marginTop: '8px' }}>
          🔴 Predators: {stats.predators}
        </DebugText>
        <DebugText secondary>
          🟢 Prey: {stats.prey}
        </DebugText>
        <DebugText secondary>
          💀 Eaten: {stats.eaten}
        </DebugText>

        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <DebugButton active={isPaused} onClick={togglePause}>
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </DebugButton>
          <DebugButton onClick={handleReset}>
            🔄 Reset
          </DebugButton>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '11px', opacity: 0.6, lineHeight: '1.4' }}>
          Predators (red) hunt prey (green).
          <br />
          Predators: fast, poor turning
          <br />
          Prey: slow, agile
        </div>
      </DebugOverlay>
    </div>
  );
}
