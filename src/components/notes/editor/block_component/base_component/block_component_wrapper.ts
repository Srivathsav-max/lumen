import type { ReactNode } from 'react';
import type { Node } from '../../../core/core';

// Block component wrapper type (matching Flutter BlockComponentWrapper exactly)
// typedef BlockComponentWrapper = Widget Function(
//   BuildContext context, {
//   required Node node,
//   required Widget child,
// });
export type BlockComponentWrapper = (
  context: any,
  options: {
    node: Node;
    child: ReactNode;
  }
) => ReactNode;