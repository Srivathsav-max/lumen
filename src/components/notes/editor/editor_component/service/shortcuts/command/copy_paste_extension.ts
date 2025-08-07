import { EditorState, Node, Selection, Position, Delta, Transaction, Path } from '../../../../../core/editor_state';
import { BulletedListBlockKeys, TodoListBlockKeys, NumberedListBlockKeys, ParagraphBlockKeys } from '../../../../../core/block_keys';
import { blockComponentDelta } from '../../../../../core/constants';
import { TextInsert } from '../../../../../core/delta';

const _listTypes = [
  BulletedListBlockKeys.type,
  TodoListBlockKeys.type,
  NumberedListBlockKeys.type,
];

export class EditorCopyPaste {
  constructor(private editorState: EditorState) {}

  async pasteSingleLineNode(insertedNode: Node): Promise<void> {
    const selection = await this.deleteSelectionIfNeeded();
    if (!selection) {
      return;
    }
    const node = this.editorState.getNodeAtPath(selection.start.path);
    const delta = node?.delta;
    if (!node || !delta) {
      return;
    }
    const transaction = this.editorState.transaction;
    const insertedDelta = insertedNode.delta;
    
    // if the node is empty paragraph (default), replace it with the inserted node.
    if (delta.isEmpty && node.type === ParagraphBlockKeys.type) {
      const combinedChildren: Node[] = [
        ...insertedNode.children.map((e) => e.deepCopy()),
        // if the original node has children, copy them to the inserted node.
        ...node.children.map((e) => e.deepCopy()),
      ];
      insertedNode = insertedNode.copyWith({ children: combinedChildren });
      transaction.insertNode(selection.end.path, insertedNode);
      transaction.deleteNode(node);
      transaction.afterSelection = Selection.collapsed(
        new Position(
          selection.end.path,
          insertedDelta?.length ?? 0,
        ),
      );
    } else if (insertedDelta) {
      // if the node is not empty, insert the delta from inserted node after the selection.
      transaction.insertTextDelta(node, selection.endIndex, insertedDelta);
      if (_listTypes.includes(node.type) && insertedNode.children.length > 0) {
        transaction.insertNodes([...node.path, 0], insertedNode.children);
      }
    }
    await this.editorState.apply(transaction);
  }

  async pasteMultiLineNodes(nodes: Node[]): Promise<void> {
    if (nodes.length <= 1) {
      throw new Error('Expected more than 1 node');
    }

    const selection = await this.deleteSelectionIfNeeded();
    if (!selection) {
      return;
    }
    const node = this.editorState.getNodeAtPath(selection.start.path);
    const delta = node?.delta;
    if (!node || !delta) {
      return;
    }

    const transaction = this.editorState.transaction;

    // check if the first node is a non-delta node,
    //  if so, insert the nodes after the current selection.
    const startWithNonDeltaBlock = !nodes[0].delta;
    if (startWithNonDeltaBlock) {
      transaction.insertNodes(this.nextPath(node.path), nodes);
      await this.editorState.apply(transaction);
      return;
    }

    const lastNodeLength = this.calculateLength(nodes);
    // merge the current selected node delta into the nodes.
    if (!delta.isEmpty) {
      const firstNode = nodes[0];
      if (firstNode.delta) {
        this.insertDelta(
          nodes[0],
          delta.slice(0, selection.startIndex),
          false,
        );
      }

      const lastNode = nodes[nodes.length - 1];
      if (lastNode.delta) {
        this.insertDelta(
          nodes[nodes.length - 1],
          delta.slice(selection.endIndex),
          true,
        );
      }
    }

    if (delta.isEmpty && node.type !== ParagraphBlockKeys.type) {
      nodes[0] = nodes[0].copyWith({
        type: node.type,
        attributes: {
          ...node.attributes,
          ...nodes[0].attributes,
        },
      });
    }

    for (const child of node.children) {
      nodes[nodes.length - 1].insert(child);
    }

    transaction.insertNodes(selection.end.path, nodes);

    // delete the current node.
    transaction.deleteNode(node);

    const path = this.calculatePath(selection.start.path, nodes);
    transaction.afterSelection = Selection.collapsed(
      new Position(path, lastNodeLength),
    );

    await this.editorState.apply(transaction);
  }

  // delete the selection if it's not collapsed.
  async deleteSelectionIfNeeded(): Promise<Selection | null> {
    const selection = this.editorState.selection;
    if (!selection) {
      return null;
    }

    // delete the selection first.
    if (!selection.isCollapsed) {
      this.editorState.deleteSelection(selection);
    }

    // fetch selection again.
    const currentSelection = this.editorState.selection;
    if (currentSelection && !currentSelection.isCollapsed) {
      throw new Error('Selection should be collapsed');
    }
    return currentSelection;
  }

  calculatePath(start: Path, nodes: Node[]): Path {
    let path = start;
    for (let i = 0; i < nodes.length; i++) {
      path = this.nextPath(path);
    }
    path = this.previousPath(path);
    if (nodes[nodes.length - 1].children.length > 0) {
      return [
        ...path,
        ...this.calculatePath([0], Array.from(nodes[nodes.length - 1].children)),
      ];
    }
    return path;
  }

  calculateLength(nodes: Node[]): number {
    if (nodes[nodes.length - 1].children.length > 0) {
      return this.calculateLength(Array.from(nodes[nodes.length - 1].children));
    }
    return nodes[nodes.length - 1].delta?.length ?? 0;
  }

  private nextPath(path: Path): Path {
    const newPath = [...path];
    newPath[newPath.length - 1]++;
    return newPath;
  }

  private previousPath(path: Path): Path {
    const newPath = [...path];
    newPath[newPath.length - 1]--;
    return newPath;
  }

  private insertDelta(node: Node, delta: Delta, insertAfter: boolean = true): void {
    if (!delta.every((element) => element instanceof TextInsert)) {
      throw new Error('Delta should only contain TextInsert operations');
    }
    
    if (!node.delta) {
      node.updateAttributes({
        [blockComponentDelta]: delta.toJson(),
      });
    } else if (insertAfter) {
      node.updateAttributes({
        [blockComponentDelta]: node.delta
          .compose(
            new Delta()
              .retain(node.delta.length)
              .addAll(delta),
          )
          .toJson(),
      });
    } else {
      node.updateAttributes({
        [blockComponentDelta]: delta
          .compose(
            new Delta()
              .retain(delta.length)
              .addAll(node.delta),
          )
          .toJson(),
      });
    }
  }
}

// Extension methods for EditorState
declare module '../../../../../core/editor_state' {
  interface EditorState {
    pasteSingleLineNode(insertedNode: Node): Promise<void>;
    pasteMultiLineNodes(nodes: Node[]): Promise<void>;
    deleteSelectionIfNeeded(): Promise<Selection | null>;
    calculatePath(start: Path, nodes: Node[]): Path;
    calculateLength(nodes: Node[]): number;
  }
}

EditorState.prototype.pasteSingleLineNode = function(insertedNode: Node): Promise<void> {
  return new EditorCopyPaste(this).pasteSingleLineNode(insertedNode);
};

EditorState.prototype.pasteMultiLineNodes = function(nodes: Node[]): Promise<void> {
  return new EditorCopyPaste(this).pasteMultiLineNodes(nodes);
};

EditorState.prototype.deleteSelectionIfNeeded = function(): Promise<Selection | null> {
  return new EditorCopyPaste(this).deleteSelectionIfNeeded();
};

EditorState.prototype.calculatePath = function(start: Path, nodes: Node[]): Path {
  return new EditorCopyPaste(this).calculatePath(start, nodes);
};

EditorState.prototype.calculateLength = function(nodes: Node[]): number {
  return new EditorCopyPaste(this).calculateLength(nodes);
};