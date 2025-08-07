import { EditorState } from '../../editor/editor_state';
import { Selection, Position } from '../../editor/selection';
import { Node } from '../../editor/node';
import { Delta } from '../../editor/delta';
import { AppFlowyClipboard, AppFlowyClipboardData } from '../../infra/clipboard';
import { markdownToDocument, documentToHTML, htmlToDocument } from '../../plugins/markdown/document_markdown';
import { AppFlowyRichTextKeys, ParagraphBlockKeys } from '../../editor/block_component/rich_text/rich_text_keys';
import { pageNode } from '../../editor/node/page_node';
import { Document } from '../../editor/document';

const linkRegex = /https?:\/\/(?:www\.)?[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/;
const phoneRegex = /^\+?(?:[0-9][\s-.]?)+[0-9]$/;

function textLengthOfNode(node: Node): number {
  return node.delta?.length ?? 0;
}

function pasteSingleLine(
  editorState: EditorState,
  selection: Selection,
  line: string,
): void {
  if (!selection.isCollapsed) {
    throw new Error('Selection must be collapsed');
  }

  // Handle link
  const attributes: Record<string, any> = linkRegex.test(line)
    ? { [AppFlowyRichTextKeys.href]: line }
    : phoneRegex.test(line)
    ? { [AppFlowyRichTextKeys.href]: line }
    : {};

  const node = editorState.getNodeAtPath(selection.end.path);
  if (!node) return;

  const transaction = editorState.transaction;
  transaction.insertText(node, selection.startIndex, line, { attributes });
  transaction.afterSelection = Selection.collapsed(
    new Position(
      selection.end.path,
      selection.startIndex + line.length,
    ),
  );
  editorState.apply(transaction);
}

function pasteMarkdown(editorState: EditorState, markdown: string): void {
  const selection = editorState.selection;
  if (!selection) return;

  const lines = markdown.split('\n');

  if (lines.length === 1) {
    pasteSingleLine(editorState, selection, lines[0]);
    return;
  }

  let path = selection.end.path.next;
  const node = editorState.document.nodeAtPath(selection.end.path);
  const delta = node?.delta;
  if (delta && delta.toPlainText().length === 0) {
    path = selection.end.path;
  }

  const document = markdownToDocument(markdown);
  const transaction = editorState.transaction;
  let afterPath = path;
  for (let i = 0; i < document.root.children.length - 1; i++) {
    afterPath = afterPath.next;
  }
  const offset = document.root.children[document.root.children.length - 1]?.delta?.length ?? 0;
  
  transaction.insertNodes(path, document.root.children);
  transaction.afterSelection = Selection.collapsed(new Position(afterPath, offset));
  editorState.apply(transaction);
}

export function handlePastePlainText(editorState: EditorState, plainText: string): void {
  const selection = editorState.selection?.normalized;
  if (!selection) return;

  const lines = plainText
    .split('\n')
    .map(line => line.replace(/\r/g, ''));

  if (lines.length === 0) {
    return;
  } else if (lines.length === 1) {
    // Single line
    pasteSingleLine(editorState, selection, lines[0]);
  } else {
    pasteMarkdown(editorState, plainText);
  }
}

export function pasteHTML(editorState: EditorState, html: string): void {
  const selection = editorState.selection?.normalized;
  if (!selection || !selection.isCollapsed) return;

  console.debug('paste html:', html);

  const htmlToNodes = htmlToDocument(html).root.children.filter(element => {
    const delta = element.delta;
    if (!delta) return true;
    return delta.length > 0;
  });

  if (htmlToNodes.length === 0) return;

  if (htmlToNodes.length === 1) {
    pasteSingleLineInText(
      editorState,
      selection.startIndex,
      htmlToNodes[0],
    );
  } else {
    pasteMultipleLinesInText(
      editorState,
      selection.start.offset,
      htmlToNodes,
    );
  }
}

function computeSelectionAfterPasteMultipleNodes(
  editorState: EditorState,
  nodes: Node[],
): Selection {
  const currentSelection = editorState.selection!;
  const currentCursor = currentSelection.start;
  const currentPath = [...currentCursor.path];
  currentPath[currentPath.length - 1] += nodes.length;
  const lenOfLastNode = textLengthOfNode(nodes[nodes.length - 1]);
  return Selection.collapsed(
    new Position(currentPath, lenOfLastNode),
  );
}

export async function handleCopy(editorState: EditorState): Promise<void> {
  const selection = editorState.selection?.normalized;
  if (!selection) return;

  let text: string;
  let html: string;

  if (selection.isCollapsed) {
    const node = editorState.getNodeAtPath(selection.end.path);
    if (!node) return;
    
    text = node.delta?.toPlainText() ?? '';
    html = documentToHTML(
      new Document(
        pageNode({ children: [node.copyWith()] }),
      ),
    );
  } else {
    text = editorState.getTextInSelection(selection).join('\n');
    const nodes = editorState.getSelectedNodes({ selection });
    if (nodes.length === 0) return;
    
    html = documentToHTML(
      new Document(
        pageNode({
          children: nodes.map(node => node.copyWith()),
        }),
      ),
    );
  }

  return AppFlowyClipboard.setData({
    text,
    html: html.length > 0 ? html : undefined,
  });
}

function pasteSingleLineInText(
  editorState: EditorState,
  offset: number,
  insertedNode: Node,
): void {
  const transaction = editorState.transaction;
  const selection = editorState.selection;
  if (!selection || !selection.isCollapsed) return;

  const node = editorState.getNodeAtPath(selection.end.path);
  const delta = node?.delta;
  if (!node || !delta) return;

  const insertedDelta = insertedNode.delta;
  if (delta.length === 0 || !insertedDelta) {
    transaction.insertNode(selection.end.path.next, insertedNode);
    transaction.deleteNode(node);
    const length = insertedNode.delta?.length ?? 0;
    transaction.afterSelection = Selection.collapsed(
      new Position(selection.end.path, length)
    );
    editorState.apply(transaction);
  } else {
    transaction.insertTextDelta(node, offset, insertedDelta);
    editorState.apply(transaction);
  }
}

function pasteMultipleLinesInText(
  editorState: EditorState,
  offset: number,
  nodes: Node[],
): void {
  const transaction = editorState.transaction;
  const selection = editorState.selection;
  const afterSelection = computeSelectionAfterPasteMultipleNodes(editorState, nodes);

  const selectionNode = editorState.getNodesInSelection(selection!);
  if (selectionNode.length === 1) {
    const node = selectionNode[0];
    if (!node.delta) {
      transaction.afterSelection = afterSelection;
      transaction.insertNodes(afterSelection.end.path, nodes);
      editorState.apply(transaction);
      return;
    }

    const [firstNode, afterNode] = sliceNode(node, offset);
    if (nodes.length === 1 && nodes[0].type === node.type) {
      transaction.deleteNode(node);
      const newDelta: any[] = firstNode.delta ? firstNode.delta.toJson() : new Delta().toJson();
      const children: Node[] = [];
      children.push(...firstNode.children);

      if (nodes[0].delta && nodes[0].delta.length > 0) {
        newDelta.push(...nodes[0].delta.toJson());
        children.push(...nodes[0].children);
      }
      if (afterNode && afterNode.delta && afterNode.delta.length > 0) {
        newDelta.push(...afterNode.delta.toJson());
        children.push(...afterNode.children);
      }

      transaction.insertNodes(afterSelection.end.path, [
        new Node({
          type: firstNode.type,
          children,
          attributes: {
            ...firstNode.attributes,
            [ParagraphBlockKeys.delta]: Delta.fromJson(newDelta).toJson(),
          },
        }),
      ]);
      transaction.afterSelection = afterSelection;
      editorState.apply(transaction);
      return;
    }

    const path = node.path;
    transaction.deleteNode(node);
    transaction.insertNodes([path[0] + 1], [
      firstNode,
      ...nodes,
      ...(afterNode && afterNode.delta && afterNode.delta.length > 0 ? [afterNode] : []),
    ]);
    transaction.afterSelection = afterSelection;
    editorState.apply(transaction);
    return;
  }

  transaction.afterSelection = afterSelection;
  transaction.insertNodes(afterSelection.end.path, nodes);
  editorState.apply(transaction);
}

export async function handlePaste(editorState: EditorState): Promise<void> {
  const data = await AppFlowyClipboard.getData();

  if (editorState.selection?.isCollapsed ?? false) {
    return pasteRichClipboard(editorState, data);
  }

  await deleteSelectedContent(editorState);

  // Use setTimeout to simulate post-frame callback
  setTimeout(() => {
    pasteRichClipboard(editorState, data);
  }, 0);
}

export function sliceNode(
  node: Node,
  selectionIndex: number,
): [Node, Node | null] {
  const delta = node.delta;
  if (!delta) {
    return [node, null]; // Node doesn't have a delta
  }

  const previousDelta = delta.slice(0, selectionIndex);
  const nextDelta = delta.slice(selectionIndex, delta.length);

  return [
    new Node({
      id: node.id,
      parent: node.parent,
      children: node.children,
      type: node.type,
      attributes: {
        ...node.attributes,
        [ParagraphBlockKeys.delta]: previousDelta.toJson(),
      },
    }),
    new Node({
      type: node.type,
      attributes: {
        ...node.attributes,
        [ParagraphBlockKeys.delta]: nextDelta.toJson(),
      },
    }),
  ];
}

function pasteRichClipboard(editorState: EditorState, data: AppFlowyClipboardData): void {
  if (data.html) {
    pasteHTML(editorState, data.html);
    return;
  }
  if (data.text) {
    handlePastePlainText(editorState, data.text);
    return;
  }
}

function isNodeInsideTable(node: Node): boolean {
  let current: Node | null = node;
  while (current) {
    if (current.type === 'table') {
      return true;
    }
    current = current.parent;
  }
  return false;
}

export function handleCut(editorState: EditorState): void {
  handleCopy(editorState);
  deleteSelectedContent(editorState);
}

export async function deleteSelectedContent(editorState: EditorState): Promise<void> {
  const selection = editorState.selection?.normalized;
  if (!selection) return;

  const transaction = editorState.transaction;
  if (selection.isCollapsed) {
    // If the selection is collapsed, delete the current node
    const node = editorState.getNodeAtPath(selection.end.path);
    if (!node || isNodeInsideTable(node)) return;

    transaction.deleteNode(node);
    const nextNode = node.next;
    if (nextNode && nextNode.delta) {
      transaction.afterSelection = Selection.collapsed(
        new Position(node.path, nextNode.delta.length ?? 0),
      );
    }
  } else {
    // If the selection is not collapsed, delete the selection
    await editorState.deleteSelection(selection);
    transaction.afterSelection = Selection.collapsed(selection.start);
  }

  await editorState.apply(transaction);
}