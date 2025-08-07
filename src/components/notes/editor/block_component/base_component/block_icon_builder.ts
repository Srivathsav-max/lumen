import { Node } from '../../../../core/editor_state';
import { ComponentChild } from '../../../../core/component';

export type BlockIconBuilder = (context: any, node: Node) => ComponentChild;