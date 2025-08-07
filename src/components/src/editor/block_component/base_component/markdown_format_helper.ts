import { EditorState, Node, Selection, Position } from '../../../core/editor_state';
import { Delta } from '../../../core/delta';

/// Formats the current node to specified markdown style.
///
/// For example,
///   bulleted list: '- '
///   numbered list: '1. '
///   quote: '" '
///   ...
///
/// The [nodeBuilder] can return a list of nodes, which will be inserted
///   into the document.
/// For example, when converting a bulleted list to a heading and the heading is
///  not allowed to contain children, then the [nodeBuilder] should return a list
///  of nodes, which contains the heading node and the children nodes.
export async function formatMarkdownSymbol(
  editorState: EditorState,
  shouldFormat: (node: Node) => boolean,
  predicate: (
    node: Node,
    text: string,
    selection: Selection,
  ) => boolean,
  nodesBuilder: (
    text: string,
    node: Node,
    delta: Delta,
  ) => Node[],
): Promise<boolean> {
  const selection = editorState.selection;
  if (!selection || !selection.isCollapsed) {
    return false;
  }

  const position = selection.end;
  const node = editorState.getNodeAtPath(position.path);

  if (!node || !shouldFormat(node)) {
    return false;
  }

  // Get the text from the start of the document until the selection.
  const delta = node.delta;
  if (!delta) {
    return false;
  }
  const text = delta.toPlainText().substring(0, selection.end.offset);

  // If the text doesn't match the predicate, then we don't want to
  // format it.
  if (!predicate(node, text, selection)) {
    return false;
  }

  const afterSelection = Selection.collapsed(
    new Position(node.path, 0),
  );

  const formattedNodes = nodesBuilder(text, node, delta);

  // Create a transaction that replaces the current node with the
  // formatted node.
  const transaction = editorState.transaction;
  transaction.insertNodes(node.path, formattedNodes);
  transaction.deleteNode(node);
  transaction.afterSelection = afterSelection;

  await editorState.apply(transaction);
  return true;
}