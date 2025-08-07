import { StatefulWidget, State, Widget, BuildContext, Key, Color, GlobalKey, MouseRegion, SystemMouseCursors, GestureDetector, DragStartDetails, DragUpdateDetails, Container, Colors, Offset } from '../../../flutter/widgets';
import { TableNode } from './table_node';
import { EditorState } from '../../editor_state';
import { TableBlockKeys } from './table_block_component';

export class TableColBorder extends StatefulWidget {
  readonly resizable: boolean;
  readonly colIdx: number;
  readonly tableNode: TableNode;
  readonly editorState: EditorState;
  readonly borderColor: Color;
  readonly borderHoverColor: Color;

  constructor(options: {
    key?: Key;
    tableNode: TableNode;
    editorState: EditorState;
    colIdx: number;
    resizable: boolean;
    borderColor: Color;
    borderHoverColor: Color;
  }) {
    super(options.key);
    this.tableNode = options.tableNode;
    this.editorState = options.editorState;
    this.colIdx = options.colIdx;
    this.resizable = options.resizable;
    this.borderColor = options.borderColor;
    this.borderHoverColor = options.borderHoverColor;
  }

  createState(): State<StatefulWidget> {
    return new TableColBorderState();
  }
}

class TableColBorderState extends State<TableColBorder> {
  private readonly _borderKey = new GlobalKey();
  private _borderHovering = false;
  private _borderDragging = false;
  private initialOffset = new Offset(0, 0);

  build(context: BuildContext): Widget {
    return this.widget.resizable
      ? this.buildResizableBorder(context)
      : this.buildFixedBorder(context);
  }

  private buildResizableBorder(context: BuildContext): MouseRegion {
    return new MouseRegion({
      cursor: SystemMouseCursors.resizeLeftRight,
      onEnter: (_) => this.setState(() => this._borderHovering = true),
      onExit: (_) => this.setState(() => this._borderHovering = false),
      child: new GestureDetector({
        onHorizontalDragStart: (details: DragStartDetails) => {
          this.setState(() => this._borderDragging = true);
          this.initialOffset = details.globalPosition;
        },
        onHorizontalDragEnd: (_) => {
          const transaction = this.widget.editorState.transaction;
          this.widget.tableNode.setColWidth(
            this.widget.colIdx,
            this.widget.tableNode.getColWidth(this.widget.colIdx),
            { transaction, force: true }
          );
          transaction.afterSelection = transaction.beforeSelection;
          this.widget.editorState.apply(transaction);
          this.setState(() => this._borderDragging = false);
        },
        onHorizontalDragUpdate: (details: DragUpdateDetails) => {
          const colWidth = this.widget.tableNode.getColWidth(this.widget.colIdx);
          this.widget.tableNode.setColWidth(
            this.widget.colIdx,
            colWidth + details.delta.dx,
          );
        },
        child: new Container({
          key: this._borderKey,
          width: this.widget.tableNode.config.borderWidth,
          height: this.context.select(
            (n: Node) => n.attributes[TableBlockKeys.colsHeight],
          ),
          color: this._borderHovering || this._borderDragging
            ? this.widget.borderHoverColor
            : this.widget.borderColor,
        }),
      }),
    });
  }

  private buildFixedBorder(context: BuildContext): Container {
    return new Container({
      width: this.widget.tableNode.config.borderWidth,
      height: this.context.select(
        (n: Node) => n.attributes[TableBlockKeys.colsHeight],
      ),
      color: Colors.grey,
    });
  }
}