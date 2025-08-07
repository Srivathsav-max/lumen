import type { ReactNode } from 'react';

// Block component builder interface (matching Flutter BlockComponentBuilder)
export interface BlockComponentBuilder {
  type: string;
  build: (context: any, node: any) => ReactNode;
}