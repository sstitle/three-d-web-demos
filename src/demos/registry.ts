import { DemoInfo } from '../types/demo';

export const demoRegistry: DemoInfo[] = [
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
  // Add more demos here as you create them
];
