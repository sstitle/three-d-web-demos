import type { DemoInfo } from '../types/demo';

export const demoRegistry: DemoInfo[] = [
  {
    id: 'ascii-effect',
    title: 'ASCII Effect',
    description: 'Real-time 3D scene rendered as ASCII art characters',
    component: () => import('./AsciiEffect'),
  },
  {
    id: 'keyboard-typing',
    title: 'Keyboard Typing',
    description: 'Type on your keyboard to see large 3D letters appear',
    component: () => import('./KeyboardTyping'),
  },
  {
    id: 'debug-scene',
    title: 'Debug Scene',
    description: 'Isometric view showing XYZ coordinate axes with RGB colors',
    component: () => import('./DebugScene'),
  },
  {
    id: 'rotating-cube',
    title: 'Rotating Cube',
    description: 'A simple rotating cube demonstrating basic ThreeJS setup',
    component: () => import('./RotatingCube'),
  },
  {
    id: 'particle-system',
    title: 'Particle System',
    description: 'Interactive particle system with mouse controls',
    component: () => import('./ParticleSystem'),
  },
  {
    id: 'ascii-keyboard-typing',
    title: 'ASCII Keyboard Typing',
    description: 'Type letters rendered as 3D text with ASCII effect and debug overlay',
    component: () => import('./AsciiKeyboardTyping'),
  },
  {
    id: 'texture-generator',
    title: 'Texture Generator',
    description: 'Generate procedural textures with solid colors or XOR patterns',
    component: () => import('./TextureGenerator'),
  },
  // Add more demos here as you create them
];
