import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import DebugOverlay, { DebugText, DebugButton } from '../components/DebugOverlay';
import { createIsometricCamera } from '../utils/threeHelpers';

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
const PREDATOR_HEIGHT = 1.5;
const PREY_HEIGHT = 0.8;
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
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
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

    // Camera - Isometric view
    const camera = createIsometricCamera(width, height, WORLD_SIZE * 1.2);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls for camera movement
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 20;
    controls.maxDistance = 150;
    controls.maxPolarAngle = Math.PI / 2; // Don't go below ground
    controls.target.set(0, 0, 0);

    // Ground plane - thin box at z=0
    const groundGeometry = new THREE.BoxGeometry(WORLD_SIZE, WORLD_SIZE, 0.2);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.z = -0.1;
    scene.add(ground);

    // World boundary - vertical walls
    const wallHeight = 2;
    const wallThickness = 0.2;
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a3e,
      roughness: 0.7,
      metalness: 0.3,
      transparent: true,
      opacity: 0.6,
    });

    // Create four walls
    const wallNorth = new THREE.Mesh(
      new THREE.BoxGeometry(WORLD_SIZE, wallThickness, wallHeight),
      wallMaterial
    );
    wallNorth.position.set(0, WORLD_SIZE / 2, wallHeight / 2);
    scene.add(wallNorth);

    const wallSouth = new THREE.Mesh(
      new THREE.BoxGeometry(WORLD_SIZE, wallThickness, wallHeight),
      wallMaterial
    );
    wallSouth.position.set(0, -WORLD_SIZE / 2, wallHeight / 2);
    scene.add(wallSouth);

    const wallEast = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, WORLD_SIZE, wallHeight),
      wallMaterial
    );
    wallEast.position.set(WORLD_SIZE / 2, 0, wallHeight / 2);
    scene.add(wallEast);

    const wallWest = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, WORLD_SIZE, wallHeight),
      wallMaterial
    );
    wallWest.position.set(-WORLD_SIZE / 2, 0, wallHeight / 2);
    scene.add(wallWest);

    // Add lighting for 3D depth
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(10, 10, 10);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x4444ff, 0.3);
    directionalLight2.position.set(-10, -10, 5);
    scene.add(directionalLight2);

    // Create initial actors
    initializeActors(scene);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (!isPausedRef.current) {
        updateSimulation();
      }

      // Update controls for damping
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
      cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
      controls.dispose();

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

      // Dispose ground and walls
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
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

    // Create 3D mesh - pyramid/wedge shape
    const group = new THREE.Group();

    // Body - tapered box (predator body)
    const bodyGeometry = new THREE.BoxGeometry(PREDATOR_SIZE, PREDATOR_SIZE * 0.8, PREDATOR_HEIGHT);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4444,
      roughness: 0.5,
      metalness: 0.3,
      emissive: 0x440000,
      emissiveIntensity: 0.2,
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.z = PREDATOR_HEIGHT / 2;
    group.add(bodyMesh);

    // Head - cone pointing forward
    const headGeometry = new THREE.ConeGeometry(PREDATOR_SIZE * 0.4, PREDATOR_SIZE * 0.6, 4);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6666,
      roughness: 0.4,
      metalness: 0.4,
    });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.set(PREDATOR_SIZE * 0.7, 0, PREDATOR_HEIGHT / 2);
    headMesh.rotation.z = -Math.PI / 2;
    group.add(headMesh);

    // Eyes (small spheres)
    const eyeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.8,
    });

    const eyeLeft = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeLeft.position.set(PREDATOR_SIZE * 0.4, PREDATOR_SIZE * 0.25, PREDATOR_HEIGHT * 0.8);
    group.add(eyeLeft);

    const eyeRight = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeRight.position.set(PREDATOR_SIZE * 0.4, -PREDATOR_SIZE * 0.25, PREDATOR_HEIGHT * 0.8);
    group.add(eyeRight);

    // Collision box outline (wireframe)
    const edgesGeometry = new THREE.EdgesGeometry(bodyGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xff8888, linewidth: 1 });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    edges.position.z = PREDATOR_HEIGHT / 2;
    group.add(edges);

    group.position.set(position.x, position.y, 0);
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

    // Create 3D mesh - rounded creature
    const group = new THREE.Group();

    // Body - rounded cylinder
    const bodyGeometry = new THREE.CylinderGeometry(PREY_SIZE / 2, PREY_SIZE / 2, PREY_HEIGHT, 12);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x44ff44,
      roughness: 0.6,
      metalness: 0.2,
      emissive: 0x004400,
      emissiveIntensity: 0.1,
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.rotation.x = Math.PI / 2; // Rotate to align with movement
    bodyMesh.position.z = PREY_HEIGHT / 2;
    group.add(bodyMesh);

    // Head - small sphere at front
    const headGeometry = new THREE.SphereGeometry(PREY_SIZE * 0.35, 12, 12);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0x66ff66,
      roughness: 0.5,
      metalness: 0.3,
    });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.set(PREY_SIZE * 0.4, 0, PREY_HEIGHT / 2);
    group.add(headMesh);

    // Eyes (tiny spheres)
    const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
    });

    const eyeLeft = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeLeft.position.set(PREY_SIZE * 0.5, PREY_SIZE * 0.15, PREY_HEIGHT * 0.7);
    group.add(eyeLeft);

    const eyeRight = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeRight.position.set(PREY_SIZE * 0.5, -PREY_SIZE * 0.15, PREY_HEIGHT * 0.7);
    group.add(eyeRight);

    // Tail - small cone at back
    const tailGeometry = new THREE.ConeGeometry(PREY_SIZE * 0.15, PREY_SIZE * 0.4, 8);
    const tailMaterial = new THREE.MeshStandardMaterial({
      color: 0x33cc33,
      roughness: 0.7,
      metalness: 0.1,
    });
    const tailMesh = new THREE.Mesh(tailGeometry, tailMaterial);
    tailMesh.position.set(-PREY_SIZE * 0.4, 0, PREY_HEIGHT / 2);
    tailMesh.rotation.z = Math.PI / 2;
    group.add(tailMesh);

    group.position.set(position.x, position.y, 0);
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
    const time = Date.now() * 0.001;

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

      // Update mesh with subtle bobbing animation
      const bobAmount = Math.sin(time * 3 + predator.position.x) * 0.1;
      predator.mesh.position.set(predator.position.x, predator.position.y, bobAmount);
      predator.mesh.rotation.z = predator.heading;

      // Subtle tilt based on velocity
      predator.mesh.rotation.x = predator.velocity.length() * 0.05;
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
        // Faster bobbing for prey (looks like hopping/scurrying)
        const bobAmount = Math.sin(time * 5 + preyActor.position.y) * 0.08;
        preyActor.mesh.position.set(preyActor.position.x, preyActor.position.y, bobAmount);
        preyActor.mesh.rotation.z = preyActor.heading;

        // Wiggle effect when fleeing (check if near predator)
        const nearPredator = predators.some(p =>
          preyActor.position.distanceTo(p.position) < DETECTION_RANGE * 0.5
        );
        if (nearPredator) {
          preyActor.mesh.rotation.x = Math.sin(time * 8) * 0.1;
        } else {
          preyActor.mesh.rotation.x = 0;
        }
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
          <br />
          <br />
          🎮 Drag to orbit • Scroll to zoom
        </div>
      </DebugOverlay>
    </div>
  );
}
