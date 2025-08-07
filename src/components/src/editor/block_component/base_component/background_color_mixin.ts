import { Node } from '../../../../core/editor_state';
import { blockComponentBackgroundColor } from '../../../../core/constants';
import { tryToColor } from '../../../../core/color_utils';

/// If you want to customize the logic of how to convert a color string to a
///   color, you can set this variable.
export type BlockComponentBackgroundColorDecorator = (
  node: Node,
  colorString: string,
) => string | null;

export let blockComponentBackgroundColorDecorator: BlockComponentBackgroundColorDecorator | null = null;

export function setBlockComponentBackgroundColorDecorator(
  decorator: BlockComponentBackgroundColorDecorator | null,
): void {
  blockComponentBackgroundColorDecorator = decorator;
}

export interface BlockComponentBackgroundColorMixin {
  node: Node;
  backgroundColor: string;
}

export function getBackgroundColor(node: Node): string {
  const colorString = node.attributes[blockComponentBackgroundColor] as string;
  if (!colorString) {
    return 'transparent';
  }

  return blockComponentBackgroundColorDecorator?.(node, colorString) ||
    tryToColor(colorString) ||
    'transparent';
}