import { Node } from '../../../../core/editor_state';
import { blockComponentAlign } from '../../../../core/constants';

export enum Alignment {
  center = 'center',
  centerRight = 'right',
  centerLeft = 'left',
}

export interface BlockComponentAlignMixin {
  node: Node;
  alignment: Alignment | null;
}

export function getAlignment(node: Node): Alignment | null {
  const alignString = node.attributes[blockComponentAlign] as string;
  switch (alignString) {
    case 'center':
      return Alignment.center;
    case 'right':
      return Alignment.centerRight;
    case 'left':
      return Alignment.centerLeft;
    default:
      return null;
  }
}

// Extension for Alignment to convert to text align
declare global {
  interface String {
    toTextAlign(): string;
  }
}

export function alignmentToTextAlign(alignment: Alignment | null): string {
  switch (alignment) {
    case Alignment.center:
      return 'center';
    case Alignment.centerRight:
      return 'right';
    case Alignment.centerLeft:
      return 'left';
    default:
      return 'left';
  }
}