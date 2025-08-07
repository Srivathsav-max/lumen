import { TableBlockKeys, TableDefaults } from './table_block_component';

export class TableConfig {
  readonly colDefaultWidth: number;
  readonly rowDefaultHeight: number;
  readonly colMinimumWidth: number;
  readonly borderWidth: number;

  constructor(options: {
    colDefaultWidth?: number;
    rowDefaultHeight?: number;
    colMinimumWidth?: number;
    borderWidth?: number;
  } = {}) {
    this.colDefaultWidth = options.colDefaultWidth ?? TableDefaults.colWidth;
    this.rowDefaultHeight = options.rowDefaultHeight ?? TableDefaults.rowHeight;
    this.colMinimumWidth = options.colMinimumWidth ?? TableDefaults.colMinimumWidth;
    this.borderWidth = options.borderWidth ?? TableDefaults.borderWidth;
  }

  static fromJson(json: Record<string, any>): TableConfig {
    function func(key: string, defaultVal: number): number {
      if (json.hasOwnProperty(key)) {
        const parsed = parseFloat(json[key]?.toString() ?? '0');
        return isNaN(parsed) ? defaultVal : parsed;
      }
      return defaultVal;
    }

    return new TableConfig({
      colDefaultWidth: func(TableBlockKeys.colDefaultWidth, TableDefaults.colWidth),
      rowDefaultHeight: func(TableBlockKeys.rowDefaultHeight, TableDefaults.rowHeight),
      colMinimumWidth: func(TableBlockKeys.colMinimumWidth, TableDefaults.colMinimumWidth),
      borderWidth: func(TableBlockKeys.borderWidth, TableDefaults.borderWidth),
    });
  }

  toJson(): Record<string, any> {
    return {
      [TableBlockKeys.colDefaultWidth]: this.colDefaultWidth,
      [TableBlockKeys.rowDefaultHeight]: this.rowDefaultHeight,
      [TableBlockKeys.colMinimumWidth]: this.colMinimumWidth,
    };
  }
}