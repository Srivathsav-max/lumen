// Quill Delta encoder for converting Quill Delta format to AppFlowy Document
export interface Document {
  root: Node;
  insert(path: number[], nodes: Node[]): void;
  static blank(options?: { withInitialText?: boolean }): Document;
}

export interface Node {
  type: string;
  path: number[];
  children: Node[];
  attributes: Record<string, any>;
  delta?: Delta;
  updateAttributes(attributes: Record<string, any>): void;
}

export interface Delta {
  ops: Array<TextInsert | any>;
  iterator(): DeltaIterator;
  insert(text: string, options?: { attributes?: Attributes }): Delta;
  retain(length: number): Delta;
  compose(other: Delta): Delta;
  toJson(): any;
  toPlainText(): string;
}

export interface DeltaIterator {
  moveNext(): boolean;
  current: TextInsert | any;
}

export interface TextInsert {
  text: string;
  attributes?: Attributes;
}

export interface Attributes {
  [key: string]: any;
}

// Constants
const _newLineSymbol = '\n';
const _header = 'header';
const _list = 'list';
const _orderedList = 'ordered';
const _bulletedList = 'bullet';
const _uncheckedList = 'unchecked';
const _checkedList = 'checked';
const _blockquote = 'blockquote';
const _indent = 'indent';

export class AppFlowyRichTextKeys {
  static readonly strikethrough = 'strikethrough';
  static readonly underline = 'underline';
  static readonly bold = 'bold';
  static readonly italic = 'italic';
  static readonly href = 'href';
  static readonly textColor = 'textColor';
  static readonly backgroundColor = 'backgroundColor';
}

// Mock implementations for node creation functions
function paragraphNode(options: { delta?: Delta } = {}): Node {
  return {
    type: 'paragraph',
    path: [],
    children: [],
    attributes: options.delta ? { delta: options.delta } : {},
    delta: options.delta,
    updateAttributes: function(attrs: Record<string, any>) {
      Object.assign(this.attributes, attrs);
    }
  };
}

function quoteNode(options: { delta?: Delta }): Node {
  return {
    type: 'quote',
    path: [],
    children: [],
    attributes: { delta: options.delta },
    delta: options.delta,
    updateAttributes: function(attrs: Record<string, any>) {
      Object.assign(this.attributes, attrs);
    }
  };
}

function headingNode(options: { delta?: Delta; level: number }): Node {
  return {
    type: 'heading',
    path: [],
    children: [],
    attributes: { delta: options.delta, level: options.level },
    delta: options.delta,
    updateAttributes: function(attrs: Record<string, any>) {
      Object.assign(this.attributes, attrs);
    }
  };
}

function bulletedListNode(options: { delta?: Delta }): Node {
  return {
    type: 'bulleted_list',
    path: [],
    children: [],
    attributes: { delta: options.delta },
    delta: options.delta,
    updateAttributes: function(attrs: Record<string, any>) {
      Object.assign(this.attributes, attrs);
    }
  };
}

function numberedListNode(options: { delta?: Delta }): Node {
  return {
    type: 'numbered_list',
    path: [],
    children: [],
    attributes: { delta: options.delta },
    delta: options.delta,
    updateAttributes: function(attrs: Record<string, any>) {
      Object.assign(this.attributes, attrs);
    }
  };
}

function todoListNode(options: { delta?: Delta; checked: boolean }): Node {
  return {
    type: 'todo_list',
    path: [],
    children: [],
    attributes: { delta: options.delta, checked: options.checked },
    delta: options.delta,
    updateAttributes: function(attrs: Record<string, any>) {
      Object.assign(this.attributes, attrs);
    }
  };
}

export const quillDeltaEncoder = new QuillDeltaEncoder();

export class QuillDeltaEncoder {
  private nestedLists: Map<number, Node[]> = new Map();

  convert(input: Delta): Document {
    const iterator = input.iterator();
    const document = this.createBlankDocument();

    let node = paragraphNode();
    let index = 0;

    while (iterator.moveNext()) {
      const op = iterator.current;
      const attributes = op.attributes;
      
      if (this.isTextInsert(op)) {
        if (op.text === _newLineSymbol) {
          if (attributes) {
            node = this._applyListStyleIfNeeded(node, attributes);
            node = this._applyHeadingStyleIfNeeded(node, attributes);
            node = this._applyBlockquoteIfNeeded(node, attributes);
            this._applyIndentIfNeeded(node, attributes);
          }
          
          if (this._isIndentBulletedList(attributes)) {
            const level = this._indentLevel(attributes);
            const parentNodes = this.nestedLists.get(level - 1);
            if (parentNodes && parentNodes.length > 0) {
              const nestedNodes = this.nestedLists.get(level);
              if (nestedNodes) {
                const path = [
                  ...parentNodes[parentNodes.length - 1].path,
                  nestedNodes.length - 1
                ];
                document.insert(path, [node]);
              }
            }
          } else {
            document.insert([index++], [node]);
          }
          node = paragraphNode();
        } else {
          const texts = op.text.split('\n');
          if (texts.length > 1) {
            node.delta?.insert(texts[0]);
            document.insert([index++], [node]);
            // Create new delta for remaining text
            const newDelta = this.createDelta();
            newDelta.insert(texts[1]);
            node = paragraphNode({ delta: newDelta });
          } else {
            this._applyStyle(node, op.text, attributes);
          }
        }
      } else {
        throw new Error('Only text insert operations are supported');
      }
    }

    if (index === 0) {
      document.insert([index], [node]);
    }

    return document;
  }

  private createBlankDocument(): Document {
    const root: Node = {
      type: 'document',
      path: [],
      children: [],
      attributes: {},
      updateAttributes: function(attrs: Record<string, any>) {
        Object.assign(this.attributes, attrs);
      }
    };

    return {
      root,
      insert: function(path: number[], nodes: Node[]) {
        if (path.length === 1 && path[0] >= 0) {
          // Set proper paths for inserted nodes
          nodes.forEach((node, index) => {
            node.path = [path[0] + index];
          });
          
          // Insert at the specified position
          if (path[0] >= this.root.children.length) {
            this.root.children.push(...nodes);
          } else {
            this.root.children.splice(path[0], 0, ...nodes);
          }
        } else if (path.length > 1) {
          // Handle nested insertion
          let current = this.root;
          for (let i = 0; i < path.length - 1; i++) {
            if (current.children[path[i]]) {
              current = current.children[path[i]];
            } else {
              return; // Invalid path
            }
          }
          
          const lastIndex = path[path.length - 1];
          nodes.forEach((node, index) => {
            node.path = [...path.slice(0, -1), lastIndex + index];
          });
          
          if (lastIndex >= current.children.length) {
            current.children.push(...nodes);
          } else {
            current.children.splice(lastIndex, 0, ...nodes);
          }
        }
      }
    };
  }

  private createDelta(): Delta {
    const ops: any[] = [];
    
    return {
      ops,
      iterator: function() {
        let index = 0;
        return {
          moveNext: () => {
            if (index < this.ops.length) {
              index++;
              return true;
            }
            return false;
          },
          get current() {
            return this.ops[index - 1];
          }
        };
      },
      insert: function(text: string, options?: { attributes?: Attributes }) {
        this.ops.push({ 
          insert: text, 
          attributes: options?.attributes 
        });
        return this;
      },
      retain: function(length: number) {
        this.ops.push({ retain: length });
        return this;
      },
      compose: function(other: Delta) {
        // Simple compose implementation - in real use, this would be more complex
        const newOps = [...this.ops, ...other.ops];
        const result = createDelta();
        result.ops.push(...newOps);
        return result;
      },
      toJson: function() {
        return { ops: this.ops };
      },
      toPlainText: function() {
        return this.ops
          .filter(op => op.insert && typeof op.insert === 'string')
          .map(op => op.insert)
          .join('');
      }
    };
    
    function createDelta(): Delta {
      return {
        ops: [],
        iterator: function() {
          let index = 0;
          return {
            moveNext: () => {
              if (index < this.ops.length) {
                index++;
                return true;
              }
              return false;
            },
            get current() {
              return this.ops[index - 1];
            }
          };
        },
        insert: function(text: string, options?: { attributes?: Attributes }) {
          this.ops.push({ 
            insert: text, 
            attributes: options?.attributes 
          });
          return this;
        },
        retain: function(length: number) {
          this.ops.push({ retain: length });
          return this;
        },
        compose: function(other: Delta) {
          const newOps = [...this.ops, ...other.ops];
          const result = createDelta();
          result.ops.push(...newOps);
          return result;
        },
        toJson: function() {
          return { ops: this.ops };
        },
        toPlainText: function() {
          return this.ops
            .filter(op => op.insert && typeof op.insert === 'string')
            .map(op => op.insert)
            .join('');
        }
      };
    }
  }

  private isTextInsert(op: any): op is TextInsert {
    return typeof op === 'object' && 'text' in op;
  }

  private _applyStyle(node: Node, text: string, attributes?: Record<string, any>): void {
    const attrs: Attributes = {};
    
    if (this._containsStyle(attributes, 'strike')) {
      attrs[AppFlowyRichTextKeys.strikethrough] = true;
    }
    if (this._containsStyle(attributes, 'underline')) {
      attrs[AppFlowyRichTextKeys.underline] = true;
    }
    if (this._containsStyle(attributes, 'bold')) {
      attrs[AppFlowyRichTextKeys.bold] = true;
    }
    if (this._containsStyle(attributes, 'italic')) {
      attrs[AppFlowyRichTextKeys.italic] = true;
    }
    
    const link = attributes?.['link'] as string;
    if (link) {
      attrs[AppFlowyRichTextKeys.href] = link;
    }
    
    const color = attributes?.['color'] as string;
    const colorHex = this._convertColorToHexString(color);
    if (colorHex) {
      attrs[AppFlowyRichTextKeys.textColor] = colorHex;
    }
    
    const backgroundColor = attributes?.['background'] as string;
    const backgroundHex = this._convertColorToHexString(backgroundColor);
    if (backgroundHex) {
      attrs[AppFlowyRichTextKeys.backgroundColor] = backgroundHex;
    }
    
    if (node.delta) {
      node.delta.insert(text, { attributes: attrs });
      node.updateAttributes({
        delta: node.delta.toJson()
      });
    }
  }

  private _applyIndentIfNeeded(node: Node, attributes: Record<string, any>): void {
    const indent = attributes[_indent] as number;
    const list = attributes[_list] as string;
    
    if (indent != null && !list && node.delta) {
      const spaces = '  '.repeat(indent);
      const newDelta = this.createDelta();
      newDelta.retain(0);
      newDelta.insert(spaces);
      
      node.updateAttributes({
        delta: node.delta.compose(newDelta).toJson()
      });
    }
  }

  private _applyBlockquoteIfNeeded(node: Node, attributes: Record<string, any>): Node {
    const blockquote = attributes[_blockquote] as boolean;
    if (blockquote === true) {
      return quoteNode({ delta: node.delta });
    }
    return node;
  }

  private _applyHeadingStyleIfNeeded(node: Node, attributes: Record<string, any>): Node {
    const header = attributes[_header] as number;
    if (header == null) {
      return node;
    }
    return headingNode({
      delta: node.delta,
      level: header
    });
  }

  private _applyListStyleIfNeeded(node: Node, attributes: Record<string, any>): Node {
    const list = attributes[_list] as string;
    
    switch (list) {
      case _bulletedList:
        const bulletedList = bulletedListNode({ delta: node.delta });
        const bulletIndent = attributes[_indent] as number;
        
        if (bulletIndent != null) {
          if (!this.nestedLists.has(bulletIndent)) {
            this.nestedLists.set(bulletIndent, []);
          }
          this.nestedLists.get(bulletIndent)!.push(bulletedList);
        } else {
          this.nestedLists.clear();
          this.nestedLists.set(0, [bulletedList]);
        }
        return bulletedList;
        
      case _orderedList:
        const numberedList = numberedListNode({ delta: node.delta });
        const numberedIndent = attributes[_indent] as number;
        
        if (numberedIndent != null) {
          if (!this.nestedLists.has(numberedIndent)) {
            this.nestedLists.set(numberedIndent, []);
          }
          this.nestedLists.get(numberedIndent)!.push(numberedList);
        } else {
          this.nestedLists.clear();
          this.nestedLists.set(0, [numberedList]);
        }
        return numberedList;
        
      case _checkedList:
        return todoListNode({
          delta: node.delta,
          checked: true
        });
        
      case _uncheckedList:
        return todoListNode({
          delta: node.delta,
          checked: false
        });
        
      default:
        return node;
    }
  }

  private _indentLevel(attributes?: Record<string, any>): number {
    const indent = attributes?.['indent'] as number;
    return indent ?? 1;
  }

  private _isIndentBulletedList(attributes?: Record<string, any>): boolean {
    const list = attributes?.[_list] as string;
    const indent = attributes?.[_indent] as number;
    return [_bulletedList, _orderedList].includes(list) && indent != null;
  }

  private _containsStyle(attributes?: Record<string, any>, key: string): boolean {
    const value = attributes?.[key] as boolean;
    return value === true;
  }

  private _convertColorToHexString(color?: string): string | null {
    if (!color) {
      return null;
    }
    
    if (color.startsWith('#')) {
      return `0xFF${color.substring(1)}`;
    } else if (color.startsWith('rgba')) {
      const rgbaList = color.substring(5, color.length - 1).split(',');
      const r = parseInt(rgbaList[0]);
      const g = parseInt(rgbaList[1]);
      const b = parseInt(rgbaList[2]);
      const a = parseFloat(rgbaList[3]);
      
      // Convert to hex format
      const alpha = Math.round(a * 255);
      return `0x${alpha.toString(16).padStart(2, '0')}${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    return null;
  }
}