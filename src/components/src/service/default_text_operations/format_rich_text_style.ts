import { EditorState } from '../../editor/editor_state';
import { Node } from '../../editor/node';
import { Selection, Position } from '../../editor/selection';
import { 
  headingNode, 
  quoteNode, 
  todoListNode, 
  bulletedListNode, 
  numberedListNode 
} from '../../editor/node/node_factory';
import { blockComponentTextDirection } from '../../editor/block_component/block_component_constants';

export function insertHeadingAfterSelection(editorState: EditorState, level: number): void {
  insertNodeAfterSelection(
    editorState,
    headingNode({ level }),
  );
}

export function insertQuoteAfterSelection(editorState: EditorState): void {
  insertNodeAfterSelection(
    editorState,
    quoteNode(),
  );
}

export function insertCheckboxAfterSelection(editorState: EditorState): void {
  insertNodeAfterSelection(
    editorState,
    todoListNode({ checked: false }),
  );
}

export function insertBulletedListAfterSelection(editorState: EditorState): void {
  insertNodeAfterSelection(
    editorState,
    bulletedListNode(),
  );
}

export function insertNumberedListAfterSelection(editorState: EditorState): void {
  insertNodeAfterSelection(
    editorState,
    numberedListNode(),
  );
}

export function insertNodeAfterSelection(
  editorState: EditorState,
  node: Node,
): boolean {
  const selection = editorState.selection;
  if (!selection || !selection.isCollapsed) {
    return false;
  }

  const currentNode = editorState.getNodeAtPath(selection.end.path);
  if (!currentNode) {
    return false;
  }

  node.updateAttributes({
    [blockComponentTextDirection]: 
      currentNode.attributes[blockComponentTextDirection],
  });

  const transaction = editorState.transaction;
  const delta = currentNode.delta;
  
  if (delta && delta.isEmpty) {
    transaction.insertNode(selection.end.path, node);
    transaction.deleteNode(currentNode);
    transaction.afterSelection = Selection.collapsed(
      new Position(selection.end.path)
    );
  } else {
    const next = selection.end.path.next;
    transaction.insertNode(next, node);
    transaction.afterSelection = Selection.collapsed(
      new Position(next)
    );
  }

  editorState.apply(transaction);
  return true;
}