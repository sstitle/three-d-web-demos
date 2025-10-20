import { ComponentType } from 'react';

export interface DemoInfo {
  id: string;
  title: string;
  description: string;
  component: () => Promise<{ default: ComponentType }>;
}
