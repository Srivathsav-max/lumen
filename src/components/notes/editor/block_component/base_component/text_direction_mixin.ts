import { EditorState, Node } from '../../../../core/editor_state';
import { 
  blockComponentTextDirection, 
  blockComponentTextDirectionAuto,
  blockComponentTextDirectionLTR,
  blockComponentTextDirectionRTL 
} from '../../../../core/constants';
import { determineTextDirection } from '../../../../core/text_direction_utils';

export enum TextDirection {
  ltr = 'ltr',
  rtl = 'rtl',
}

export interface BlockComponentTextDirectionMixin {
  editorState: EditorState;
  node: Node;
  lastDirection?: TextDirection;
  calculateTextDirection(layoutDirection?: TextDirection): TextDirection;
}

export function calculateTextDirection(
  editorState: EditorState,
  node: Node,
  layoutDirection?: TextDirection,
  lastDirection?: TextDirection,
): TextDirection {
  layoutDirection = layoutDirection || TextDirection.ltr;
  const defaultTextDirection = editorState.editorStyle.defaultTextDirection;

  const direction = calculateNodeDirection({
    node,
    layoutDirection,
    defaultTextDirection,
    lastDirection,
  });

  // node indent padding is added by parent node and the padding direction
  // is equal to the node text direction. when the node direction is auto
  // there is a special case which on typing text, the node direction could
  // change without any change to parent node, because no attribute of the
  // node changes as the direction attribute is auto but the calculated can
  // change to rtl or ltr. in this cases we should notify parent node to
  // recalculate the indent padding.
  if (node.level > 1 &&
      direction !== lastDirection &&
      getNodeDirection(node, defaultTextDirection) === blockComponentTextDirectionAuto) {
    requestAnimationFrame(() => node.parent?.notify());
  }

  return direction;
}

/// Calculate the text direction of a node.
// If the textDirection attribute is not set, we will use defaultTextDirection if
// it has a value (defaultTextDirection != null). If not will use layoutDirection.
// If the textDirection is ltr or rtl we will apply that.
// If the textDirection is auto we go by these priorities:
// 1. Determine the direction by first character with strong directionality
// 2. lastDirection which is the node last determined direction
// 3. previous line direction
// 4. defaultTextDirection
// 5. layoutDirection
// We will move from first priority when for example the node text is empty or
// it only has characters without strong directionality e.g. '@'.
export function calculateNodeDirection(options: {
  node: Node;
  layoutDirection: TextDirection;
  defaultTextDirection?: string;
  lastDirection?: TextDirection;
}): TextDirection {
  const { node, layoutDirection, defaultTextDirection, lastDirection } = options;

  // if the block component has a text direction attribute which is not auto,
  // use it
  const value = getNodeDirection(node, defaultTextDirection);
  if (value && value !== blockComponentTextDirectionAuto) {
    const direction = stringToTextDirection(value);
    if (direction) {
      return direction;
    }
  }

  let effectiveDefaultTextDirection = defaultTextDirection;
  if (value === blockComponentTextDirectionAuto) {
    if (lastDirection) {
      effectiveDefaultTextDirection = lastDirection;
    } else {
      effectiveDefaultTextDirection = 
        getDirectionFromPreviousOrParentNode(node, defaultTextDirection) ||
        defaultTextDirection;
    }
  }

  // if the value is null or the text is null or empty,
  // use the default text direction
  const text = node.delta?.toPlainText();
  if (!value || !text || text.length === 0) {
    return stringToTextDirection(effectiveDefaultTextDirection) || layoutDirection;
  }

  // if the value is auto and the text isn't null or empty,
  // calculate the text direction by the text
  return determineTextDirection(text) ||
    stringToTextDirection(effectiveDefaultTextDirection) ||
    layoutDirection;
}

function getDirectionFromPreviousOrParentNode(
  node: Node,
  defaultTextDirection?: string,
): string | null {
  let prevOrParentNodeDirection: TextDirection | null = null;
  
  if (node.previous) {
    prevOrParentNodeDirection = getDirectionFromNode(node.previous, defaultTextDirection);
  }
  
  if (node.parent && !prevOrParentNodeDirection) {
    prevOrParentNodeDirection = getDirectionFromNode(node.parent, defaultTextDirection);
  }
  
  return prevOrParentNodeDirection;
}

function getDirectionFromNode(node: Node, defaultTextDirection?: string): TextDirection | null {
  const nodeDirection = getNodeDirection(
    node,
    defaultTextDirection === blockComponentTextDirectionAuto
      ? blockComponentTextDirectionAuto
      : undefined,
  );
  
  if (nodeDirection === blockComponentTextDirectionAuto) {
    return node.selectable?.textDirection() || null;
  } else {
    return stringToTextDirection(nodeDirection);
  }
}

function getNodeDirection(node: Node, defaultDirection?: string): string | null {
  return (node.attributes[blockComponentTextDirection] as string) || defaultDirection || null;
}

function stringToTextDirection(direction?: string | null): TextDirection | null {
  if (direction === blockComponentTextDirectionLTR) {
    return TextDirection.ltr;
  } else if (direction === blockComponentTextDirectionRTL) {
    return TextDirection.rtl;
  }
  return null;
}