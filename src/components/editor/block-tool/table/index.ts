import { TunesMenuConfig } from "@editorjs/editorjs/types/tools";
import "./index.css";
import {
  type BlockTool,
  type ToolboxConfig,
  type BlockToolConstructorOptions,
  type ConversionConfig,
  type SanitizerConfig,
} from "@editorjs/editorjs";

type TableData = {
  withHeadings?: boolean;
  content: string[][];
};

export type TableConfig = {
  rows?: number;
  cols?: number;
  withHeadings?: boolean;
};

export default class TableBlock implements BlockTool {
  /**
   * Editor.js API
   */
  public api;
  /**
   * Read only mode flag
   */
  public readOnly;
  /**
   * Table configuration
   */
  private _config;
  /**
   * Table data
   */
  private _data;
  /**
   * Table element
   */
  private _holderNode;
  /**
   * Table css
   */
  private _CSS;

  constructor({
    api,
    data,
    readOnly,
    config,
  }: BlockToolConstructorOptions<TableData, TableConfig>) {
    this.api = api;
    this.readOnly = readOnly;

    this._CSS = {
      block: this.api.styles.block,
      wrapper: "cdx-table",
      table: "cdx-table__table",
      row: "cdx-table__row",
      cell: "cdx-table__cell",
      cellInput: "cdx-table__cell-input",
      withHeadings: "cdx-table--with-headings",
      addRow: "cdx-table__add-row",
      addCol: "cdx-table__add-col",
      controls: "cdx-table__controls",
    };

    this._config = {
      rows: config?.rows || 2,
      cols: config?.cols || 2,
      withHeadings: config?.withHeadings || false,
    };

    this._data = this._normalizeData(data);
    this._holderNode = this._drawView();
  }

  /**
   * Normalize input data
   */
  private _normalizeData(data: Partial<TableData>): TableData {
    const normalizedData: TableData = {
      withHeadings: data.withHeadings || false,
      content: [],
    };

    if (data.content && Array.isArray(data.content)) {
      normalizedData.content = data.content.map(row => 
        Array.isArray(row) ? [...row] : []
      );
    } else {
      // Create default table
      for (let i = 0; i < this._config.rows!; i++) {
        const row: string[] = [];
        for (let j = 0; j < this._config.cols!; j++) {
          row.push("");
        }
        normalizedData.content.push(row);
      }
    }

    return normalizedData;
  }

  /**
   * Create Tool's view
   */
  private _drawView(): HTMLDivElement {
    const wrapper = document.createElement("DIV") as HTMLDivElement;
    const table = document.createElement("TABLE") as HTMLTableElement;
    const controls = document.createElement("DIV") as HTMLDivElement;

    wrapper.classList.add(this._CSS.wrapper);
    table.classList.add(this._CSS.table);
    controls.classList.add(this._CSS.controls);

    if (this._data.withHeadings) {
      wrapper.classList.add(this._CSS.withHeadings);
    }

    this._createTable(table);
    
    if (!this.readOnly) {
      this._createControls(controls);
      wrapper.appendChild(controls);
    }

    wrapper.appendChild(table);

    return wrapper;
  }

  /**
   * Create table structure
   */
  private _createTable(table: HTMLTableElement): void {
    this._data.content.forEach((rowData, rowIndex) => {
      const row = document.createElement("TR");
      row.classList.add(this._CSS.row);

      rowData.forEach((cellData, colIndex) => {
        const isHeader = this._data.withHeadings && rowIndex === 0;
        const cell = document.createElement(isHeader ? "TH" : "TD");
        const input = document.createElement("DIV");

        cell.classList.add(this._CSS.cell);
        input.classList.add(this._CSS.cellInput);

        input.contentEditable = !this.readOnly ? "true" : "false";
        input.innerHTML = cellData;

        if (!this.readOnly) {
          input.addEventListener("keydown", (e) => this._handleCellKeydown(e, rowIndex, colIndex));
          input.addEventListener("input", () => this._updateData());
        }

        cell.appendChild(input);
        row.appendChild(cell);
      });

      table.appendChild(row);
    });
  }

  /**
   * Create table controls
   */
  private _createControls(controls: HTMLDivElement): void {
    const addRowBtn = document.createElement("BUTTON");
    const addColBtn = document.createElement("BUTTON");

    addRowBtn.classList.add(this._CSS.addRow);
    addColBtn.classList.add(this._CSS.addCol);

    addRowBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" x2="12" y1="5" y2="19"/>
        <line x1="5" x2="19" y1="12" y2="12"/>
      </svg>
      Add row
    `;

    addColBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" x2="12" y1="5" y2="19"/>
        <line x1="5" x2="19" y1="12" y2="12"/>
      </svg>
      Add column
    `;

    addRowBtn.addEventListener("click", () => this._addRow());
    addColBtn.addEventListener("click", () => this._addColumn());

    controls.appendChild(addRowBtn);
    controls.appendChild(addColBtn);
  }

  /**
   * Handle cell keyboard navigation
   */
  private _handleCellKeydown(event: KeyboardEvent, rowIndex: number, colIndex: number): void {
    const { key } = event;
    
    if (key === "Tab") {
      event.preventDefault();
      const nextColIndex = colIndex + 1;
      const nextRowIndex = nextColIndex >= this._data.content[0].length ? rowIndex + 1 : rowIndex;
      const finalColIndex = nextColIndex >= this._data.content[0].length ? 0 : nextColIndex;

      if (nextRowIndex < this._data.content.length) {
        this._focusCell(nextRowIndex, finalColIndex);
      } else {
        this._addRow();
        setTimeout(() => this._focusCell(nextRowIndex, 0), 0);
      }
    } else if (key === "Enter") {
      event.preventDefault();
      if (rowIndex + 1 < this._data.content.length) {
        this._focusCell(rowIndex + 1, colIndex);
      } else {
        this._addRow();
        setTimeout(() => this._focusCell(rowIndex + 1, colIndex), 0);
      }
    }
  }

  /**
   * Focus specific cell
   */
  private _focusCell(rowIndex: number, colIndex: number): void {
    const rows = this._holderNode.querySelectorAll(`.${this._CSS.row}`);
    const targetRow = rows[rowIndex] as HTMLTableRowElement;
    if (targetRow) {
      const cells = targetRow.querySelectorAll(`.${this._CSS.cellInput}`);
      const targetCell = cells[colIndex] as HTMLElement;
      if (targetCell) {
        targetCell.focus();
      }
    }
  }

  /**
   * Add new row
   */
  private _addRow(): void {
    const newRow: string[] = [];
    const colCount = this._data.content[0]?.length || 2;
    
    for (let i = 0; i < colCount; i++) {
      newRow.push("");
    }
    
    this._data.content.push(newRow);
    this._updateView();
  }

  /**
   * Add new column
   */
  private _addColumn(): void {
    this._data.content.forEach(row => {
      row.push("");
    });
    this._updateView();
  }

  /**
   * Update data from current table state
   */
  private _updateData(): void {
    const rows = this._holderNode.querySelectorAll(`.${this._CSS.row}`);
    
    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll(`.${this._CSS.cellInput}`);
      cells.forEach((cell, colIndex) => {
        if (this._data.content[rowIndex]) {
          this._data.content[rowIndex][colIndex] = (cell as HTMLElement).innerHTML;
        }
      });
    });
  }

  /**
   * Update view after data change
   */
  private _updateView(): void {
    const table = this._holderNode.querySelector(`.${this._CSS.table}`) as HTMLTableElement;
    table.innerHTML = "";
    this._createTable(table);
  }

  /**
   * Extract Tool's data from the view
   */
  save(): TableData {
    this._updateData();
    return {
      withHeadings: this._data.withHeadings,
      content: this._data.content,
    };
  }

  /**
   * Settings menu
   */
  renderSettings(): TunesMenuConfig {
    return [
      {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/></svg>`,
        label: this.api.i18n.t("With headings"),
        onActivate: () => this._toggleHeadings(),
        closeOnActivate: true,
        isActive: this._data.withHeadings,
      },
    ];
  }

  /**
   * Toggle table headings
   */
  private _toggleHeadings(): void {
    this._data.withHeadings = !this._data.withHeadings;
    
    if (this._data.withHeadings) {
      this._holderNode.classList.add(this._CSS.withHeadings);
    } else {
      this._holderNode.classList.remove(this._CSS.withHeadings);
    }
    
    this._updateView();
  }

  render(): HTMLDivElement {
    return this._holderNode;
  }

  /**
   * Returns true to notify the core that read-only mode is supported
   */
  static get isReadOnlySupported(): boolean {
    return true;
  }

  /**
   * Tool's Toolbox settings
   */
  static get toolbox(): ToolboxConfig {
    return {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="lc"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>`,
      title: "Table",
    };
  }

  /**
   * Sanitizer config
   */
  static get sanitize(): SanitizerConfig {
    return {
      withHeadings: false,
      content: true,
    };
  }
}
