import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import DebugOverlay, { DebugText, DebugButton } from '../components/DebugOverlay';

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_cameraPos;
uniform vec3 u_cameraTarget;
uniform float u_fov;
uniform int u_shape;
uniform bool u_smoothUnion;
uniform float u_smoothness;

varying vec2 vUv;

const int MAX_STEPS = 100;
const float MAX_DIST = 100.0;
const float SURF_DIST = 0.001;

// SDF Primitives
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

float sdOctahedron(vec3 p, float s) {
  p = abs(p);
  float m = p.x + p.y + p.z - s;
  vec3 q;
  if(3.0 * p.x < m) q = p.xyz;
  else if(3.0 * p.y < m) q = p.yzx;
  else if(3.0 * p.z < m) q = p.zxy;
  else return m * 0.57735027;

  float k = clamp(0.5 * (q.z - q.y + s), 0.0, s);
  return length(vec3(q.x, q.y - s + k, q.z - k));
}

// CSG Operations
float opUnion(float d1, float d2) {
  return min(d1, d2);
}

float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

// Scene SDF
float map(vec3 p) {
  // Ground plane
  float ground = p.y + 1.0;

  // Animated shape
  vec3 shapePos = p - vec3(0.0, 0.5, 0.0);

  // Rotate the shape
  float angle = u_time * 0.5;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  shapePos.xz = rot * shapePos.xz;

  float shape;
  if(u_shape == 0) {
    shape = sdSphere(shapePos, 1.0);
  } else if(u_shape == 1) {
    shape = sdBox(shapePos, vec3(0.8, 0.8, 0.8));
  } else if(u_shape == 2) {
    shape = sdTorus(shapePos, vec2(1.0, 0.3));
  } else {
    shape = sdOctahedron(shapePos, 1.0);
  }

  // Secondary sphere for CSG demonstration
  vec3 sphere2Pos = p - vec3(sin(u_time * 0.3) * 1.5, 0.5, cos(u_time * 0.3) * 1.5);
  float sphere2 = sdSphere(sphere2Pos, 0.6);

  // Combine shapes
  float combined;
  if(u_smoothUnion) {
    combined = opSmoothUnion(shape, sphere2, u_smoothness);
  } else {
    combined = opUnion(shape, sphere2);
  }

  return opUnion(combined, ground);
}

// Calculate normal using gradient
vec3 calcNormal(vec3 p) {
  float d = map(p);
  vec2 e = vec2(0.001, 0.0);

  vec3 n = d - vec3(
    map(p - e.xyy),
    map(p - e.yxy),
    map(p - e.yyx)
  );

  return normalize(n);
}

// Raymarching
float rayMarch(vec3 ro, vec3 rd) {
  float dO = 0.0;

  for(int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * dO;
    float dS = map(p);
    dO += dS;
    if(dO > MAX_DIST || dS < SURF_DIST) break;
  }

  return dO;
}

// Lighting
float getLight(vec3 p) {
  vec3 lightPos = vec3(3.0, 5.0, 4.0);
  vec3 l = normalize(lightPos - p);
  vec3 n = calcNormal(p);

  float dif = clamp(dot(n, l), 0.0, 1.0);

  // Soft shadows
  vec3 shadowOrigin = p + n * SURF_DIST * 2.0;
  float d = rayMarch(shadowOrigin, l);
  if(d < length(lightPos - shadowOrigin)) {
    dif *= 0.3;
  }

  return dif;
}

void main() {
  // Normalized pixel coordinates (from -1 to 1)
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= u_resolution.x / u_resolution.y;

  // Camera setup
  vec3 ro = u_cameraPos;
  vec3 target = u_cameraTarget;
  vec3 forward = normalize(target - ro);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
  vec3 up = cross(forward, right);

  float fovRadians = u_fov * 3.14159265 / 180.0;
  float planeDist = 1.0 / tan(fovRadians / 2.0);

  vec3 rd = normalize(forward * planeDist + right * uv.x + up * uv.y);

  // Raymarch
  float d = rayMarch(ro, rd);

  // Color
  vec3 color = vec3(0.0);

  if(d < MAX_DIST) {
    vec3 p = ro + rd * d;
    float dif = getLight(p);

    // Color based on height and lighting
    vec3 baseColor;
    if(p.y < -0.5) {
      // Ground
      baseColor = vec3(0.3, 0.3, 0.4);
    } else {
      // Shape - color based on normal
      vec3 n = calcNormal(p);
      baseColor = vec3(0.5) + 0.5 * n;
    }

    color = baseColor * dif + baseColor * 0.1; // Add ambient
  } else {
    // Background gradient
    color = mix(vec3(0.1, 0.1, 0.15), vec3(0.5, 0.6, 0.8), uv.y * 0.5 + 0.5);
  }

  // Gamma correction
  color = pow(color, vec3(0.4545));

  gl_FragColor = vec4(color, 1.0);
}
`;

const SHAPES = ['Sphere', 'Box', 'Torus', 'Octahedron'];

export default function RaymarchedSDF() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const animationFrameRef = useRef<number>(0);

  const [shapeIndex, setShapeIndex] = useState(0);
  const [smoothUnion, setSmoothUnion] = useState(true);
  const [smoothness, setSmoothness] = useState(0.5);
  const [cameraDistance, setCameraDistance] = useState(5.0);
  const [cameraHeight, setCameraHeight] = useState(3.0);

  // Refs to access current state values in animation loop
  const cameraDistanceRef = useRef(cameraDistance);
  const cameraHeightRef = useRef(cameraHeight);
  const shapeIndexRef = useRef(shapeIndex);
  const smoothUnionRef = useRef(smoothUnion);
  const smoothnessRef = useRef(smoothness);

  // Keep refs in sync with state
  useEffect(() => {
    cameraDistanceRef.current = cameraDistance;
  }, [cameraDistance]);

  useEffect(() => {
    cameraHeightRef.current = cameraHeight;
  }, [cameraHeight]);

  useEffect(() => {
    shapeIndexRef.current = shapeIndex;
  }, [shapeIndex]);

  useEffect(() => {
    smoothUnionRef.current = smoothUnion;
  }, [smoothUnion]);

  useEffect(() => {
    smoothnessRef.current = smoothness;
  }, [smoothness]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create shader material
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_resolution: { value: new THREE.Vector2(
          container.clientWidth,
          container.clientHeight
        )},
        u_time: { value: 0 },
        u_cameraPos: { value: new THREE.Vector3(0, 3, 5) },
        u_cameraTarget: { value: new THREE.Vector3(0, 0, 0) },
        u_fov: { value: 45 },
        u_shape: { value: 0 },
        u_smoothUnion: { value: true },
        u_smoothness: { value: 0.5 },
      },
    });
    materialRef.current = material;

    // Create a fullscreen quad
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Animation loop
    const startTime = Date.now();

    const animate = () => {
      const elapsedTime = (Date.now() - startTime) / 1000;

      if (materialRef.current) {
        materialRef.current.uniforms.u_time.value = elapsedTime;

        // Update camera position based on current state
        const angle = elapsedTime * 0.2;
        const camX = Math.sin(angle) * cameraDistanceRef.current;
        const camZ = Math.cos(angle) * cameraDistanceRef.current;
        materialRef.current.uniforms.u_cameraPos.value.set(camX, cameraHeightRef.current, camZ);

        // Update other uniforms from refs
        materialRef.current.uniforms.u_shape.value = shapeIndexRef.current;
        materialRef.current.uniforms.u_smoothUnion.value = smoothUnionRef.current;
        materialRef.current.uniforms.u_smoothness.value = smoothnessRef.current;
      }

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;

      renderer.setSize(width, height);

      if (materialRef.current) {
        materialRef.current.uniforms.u_resolution.value.set(width, height);
      }
    });

    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#000' }} />
      <DebugOverlay position="top-left">
        <div>Raymarched SDF</div>
        <DebugText secondary>Shape: {SHAPES[shapeIndex]}</DebugText>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          {SHAPES.map((shape, i) => (
            <DebugButton
              key={shape}
              active={i === shapeIndex}
              onClick={() => setShapeIndex(i)}
            >
              {shape}
            </DebugButton>
          ))}
        </div>

        <div style={{ marginTop: '1rem' }}>
          <DebugButton
            active={smoothUnion}
            onClick={() => setSmoothUnion(!smoothUnion)}
          >
            Smooth Union: {smoothUnion ? 'ON' : 'OFF'}
          </DebugButton>
        </div>

        {smoothUnion && (
          <div style={{ marginTop: '0.5rem' }}>
            <DebugText secondary>Smoothness: {smoothness.toFixed(2)}</DebugText>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={smoothness}
              onChange={(e) => setSmoothness(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          <DebugText secondary>Camera Distance: {cameraDistance.toFixed(1)}</DebugText>
          <input
            type="range"
            min="3"
            max="10"
            step="0.5"
            value={cameraDistance}
            onChange={(e) => setCameraDistance(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginTop: '0.5rem' }}>
          <DebugText secondary>Camera Height: {cameraHeight.toFixed(1)}</DebugText>
          <input
            type="range"
            min="0"
            max="6"
            step="0.5"
            value={cameraHeight}
            onChange={(e) => setCameraHeight(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </DebugOverlay>
    </div>
  );
}
