import { EditorState } from '../editor_state';
import { Node } from '../node';
import { BlockComponentSelectable } from '../block_component/block_component_selectable';

export interface EditorStateSelectableExtension {
  getFirstSelectable(): [Node, BlockComponentSelectable] | null;
  getLastSelectable(): [Node, BlockComponentSelectable] | null;
}

export const EditorStateSelectableUtils = {
  getFirstSelectable(editorState: EditorState): [Node, BlockComponentSelectable] | null {
    const nodes = editorState.document.root.children;
    for (let i = 0; i < nodes.length; i++) {
      const selectable = editorState.renderer.blockComponentSelectable(nodes[i].type);
      if (selectable !== null) {
        return [nodes[i], selectable];
      }
    }
    return null;
  },

  getLastSelectable(editorState: EditorState): [Node, BlockComponentSelectable] | null {
    const nodes = editorState.document.root.children;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const selectable = editorState.renderer.blockComponentSelectable(nodes[i].type);
      if (selectable !== null) {
        return [nodes[i], selectable];
      }
    }
    return null;
  }
};

// Extension method pattern for EditorState
declare module '../editor_state' {
  interface EditorState {
    getFirstSelectable(): [Node, BlockComponentSelectable] | null;
    getLastSelectable(): [Node, BlockComponentSelectable] | null;
  }
}

// Add methods to EditorState prototype
if (typeof EditorState !== 'undefined') {
  EditorState.prototype.getFirstSelectable = function(): [Node, BlockComponentSelectable] | null {
    return EditorStateSelectableUtils.getFirstSelectable(this);
  };

  EditorState.prototype.getLastSelectable = function(): [Node, BlockComponentSelectable] | null {
    return EditorStateSelectableUtils.getLastSelectable(this);
  };
}