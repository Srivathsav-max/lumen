import { Node } from '../../node';
import { TableCellBlockKeys } from './table_cell_block_keys';
import { TableBlockKeys } from './table_block_keys';
import { TableDefaults } from './table_defaults';

export function getCellNode(tableNode: Node, col: number, row: number): Node | undefined {
  return tableNode.children.find(
    (n) =>
      n.attributes[TableCellBlockKeys.colPosition] === col &&
      n.attributes[TableCellBlockKeys.rowPosition] === row,
  );
}

declare global {
  interface Number {
    toDouble(defaultValue?: number): number;
  }
}

// Extension for dynamic values to convert to double
export function toDouble(value: any, defaultValue: number = 0.0): number {
  if (typeof value === 'number') {
    return value;
  } else if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  } else {
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? defaultValue : parsed;
  }
}

declare module '../../node' {
  interface Node {
    get cellWidth(): number;
    get cellHeight(): number;
    get colHeight(): number;
  }
}

// Extension methods for Node
Object.defineProperty(Node.prototype, 'cellWidth', {
  get: function(this: Node): number {
    console.assert(this.type === TableCellBlockKeys.type);
    return toDouble(this.attributes[TableCellBlockKeys.width], TableDefaults.colWidth);
  },
  enumerable: false,
  configurable: true,
});

Object.defineProperty(Node.prototype, 'cellHeight', {
  get: function(this: Node): number {
    console.assert(this.type === TableCellBlockKeys.type);
    return toDouble(this.attributes[TableCellBlockKeys.height], TableDefaults.rowHeight);
  },
  enumerable: false,
  configurable: true,
});

Object.defineProperty(Node.prototype, 'colHeight', {
  get: function(this: Node): number {
    console.assert(this.type === TableBlockKeys.type);
    return toDouble(this.attributes[TableBlockKeys.colsHeight], TableDefaults.rowHeight);
  },
  enumerable: false,
  configurable: true,
});