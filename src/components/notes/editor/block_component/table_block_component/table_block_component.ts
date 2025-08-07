import { BlockComponentBuilder, BlockComponentWidget, BlockComponentContext, BlockComponentConfiguration, BlockComponentStatefulWidget, BlockComponentValidate } from '../base_component/block_component';
import { Node } from '../../node';
import { EditorState } from '../../editor_state';
import { StatefulWidget, State, Widget, BuildContext, Key, VoidCallback, Color, Icon, Icons, Colors, Scrollbar, ScrollController, SingleChildScrollView, EdgeInsets, Axis, Padding, GlobalKey, RenderBox, Offset, Rect, Position, Selection } from '../../../flutter/widgets';
import { SelectableMixin, BlockComponentConfigurable } from '../../render/selection/selectable';
import { BlockSelectionContainer, BlockSelectionType } from '../../render/selection/block_selection_container';
import { BlockComponentActionWrapper } from '../base_component/block_component_action_wrapper';
import { TableNode } from './table_node';
import { TableView } from './table_view';
import { AppFlowyEditorLog } from '../../log';
import { TableCellBlockKeys } from './table_cell_block_keys';
import { AppFlowyEditorL10n } from '../../l10n/appflowy_editor_l10n';
import { SelectionMenuItem, SelectionMenuIconWidget } from '../../toolbar/selection_menu';
import { CursorStyle } from '../../render/selection/cursor_style';

export class TableBlockKeys {
  static readonly type = 'table';
  static readonly colDefaultWidth = 'colDefaultWidth';
  static readonly rowDefaultHeight = 'rowDefaultHeight';
  static readonly colMinimumWidth = 'colMinimumWidth';
  static readonly borderWidth = 'borderWidth';
  static readonly colsLen = 'colsLen';
  static readonly rowsLen = 'rowsLen';
  static readonly colsHeight = 'colsHeight';
}

export class TableStyle {
  readonly colWidth: number;
  readonly rowHeight: number;
  readonly colMinimumWidth: number;
  readonly borderWidth: number;
  readonly addIcon: Widget;
  readonly handlerIcon: Widget;
  readonly borderColor: Color;
  readonly borderHoverColor: Color;

  constructor(options: {
    colWidth?: number;
    rowHeight?: number;
    colMinimumWidth?: number;
    borderWidth?: number;
    addIcon?: Widget;
    handlerIcon?: Widget;
    borderColor?: Color;
    borderHoverColor?: Color;
  } = {}) {
    this.colWidth = options.colWidth ?? 160;
    this.rowHeight = options.rowHeight ?? 40;
    this.colMinimumWidth = options.colMinimumWidth ?? 40;
    this.borderWidth = options.borderWidth ?? 2;
    this.addIcon = options.addIcon ?? TableDefaults.addIcon;
    this.handlerIcon = options.handlerIcon ?? TableDefaults.handlerIcon;
    this.borderColor = options.borderColor ?? TableDefaults.borderColor;
    this.borderHoverColor = options.borderHoverColor ?? TableDefaults.borderHoverColor;
  }
}

export class TableDefaults {
  static colWidth = 160.0;
  static rowHeight = 40.0;
  static colMinimumWidth = 40.0;
  static borderWidth = 2.0;
  static readonly addIcon = new Icon(Icons.add, { size: 20 });
  static readonly handlerIcon = new Icon(Icons.drag_indicator);
  static readonly borderColor = Colors.grey;
  static readonly borderHoverColor = Colors.blue;
}

export enum TableDirection {
  row = 'row',
  col = 'col',
}

export type TableBlockComponentMenuBuilder = (
  node: Node,
  editorState: EditorState,
  index: number,
  direction: TableDirection,
  onInsert?: VoidCallback,
  onDelete?: VoidCallback,
) => Widget;

export class TableBlockComponentBuilder extends BlockComponentBuilder {
  readonly menuBuilder?: TableBlockComponentMenuBuilder;
  readonly tableStyle: TableStyle;

  constructor(options: {
    configuration?: BlockComponentConfiguration;
    tableStyle?: TableStyle;
    menuBuilder?: TableBlockComponentMenuBuilder;
  } = {}) {
    super(options.configuration);
    this.tableStyle = options.tableStyle ?? new TableStyle();
    this.menuBuilder = options.menuBuilder;
  }

  build(blockComponentContext: BlockComponentContext): BlockComponentWidget {
    const node = blockComponentContext.node;
    TableDefaults.colWidth = this.tableStyle.colWidth;
    TableDefaults.rowHeight = this.tableStyle.rowHeight;
    TableDefaults.colMinimumWidth = this.tableStyle.colMinimumWidth;
    TableDefaults.borderWidth = this.tableStyle.borderWidth;
    
    return new TableBlockComponentWidget({
      key: node.key,
      tableNode: new TableNode({ node }),
      node: node,
      configuration: this.configuration,
      menuBuilder: this.menuBuilder,
      tableStyle: this.tableStyle,
      showActions: this.showActions(node),
      actionBuilder: (context, state) => this.actionBuilder(
        blockComponentContext,
        state,
      ),
      actionTrailingBuilder: (context, state) => this.actionTrailingBuilder(
        blockComponentContext,
        state,
      ),
    });
  }

  get validate(): BlockComponentValidate {
    return (node: Node) => {
      // check the node is valid
      if (Object.keys(node.attributes).length === 0) {
        AppFlowyEditorLog.editor.debug('TableBlockComponentBuilder: node is empty');
        return false;
      }

      // check the node has rowPosition and colPosition
      if (!node.attributes.hasOwnProperty(TableBlockKeys.colsLen) ||
          !node.attributes.hasOwnProperty(TableBlockKeys.rowsLen)) {
        AppFlowyEditorLog.editor.debug(
          'TableBlockComponentBuilder: node has no colsLen or rowsLen',
        );
        return false;
      }

      const colsLen = node.attributes[TableBlockKeys.colsLen];
      const rowsLen = node.attributes[TableBlockKeys.rowsLen];

      // check its children
      const children = node.children;
      if (children.length === 0) {
        AppFlowyEditorLog.editor.debug('TableBlockComponentBuilder: children is empty');
        return false;
      }

      if (children.length !== colsLen * rowsLen) {
        AppFlowyEditorLog.editor.debug(
          `TableBlockComponentBuilder: children length(${children.length}) is not equal to colsLen * rowsLen(${colsLen} * ${rowsLen})`,
        );
        return false;
      }

      // all children should contain rowPosition and colPosition
      for (let i = 0; i < colsLen; i++) {
        for (let j = 0; j < rowsLen; j++) {
          const child = children.filter(
            (n) =>
              n.attributes[TableCellBlockKeys.colPosition] === i &&
              n.attributes[TableCellBlockKeys.rowPosition] === j,
          );
          if (child.length === 0) {
            AppFlowyEditorLog.editor.debug(
              `TableBlockComponentBuilder: child(${i}, ${j}) is empty`,
            );
            return false;
          }

          // should only contains one child
          if (child.length !== 1) {
            AppFlowyEditorLog.editor.debug(
              `TableBlockComponentBuilder: child(${i}, ${j}) is not unique`,
            );
            return false;
          }
        }
      }

      return true;
    };
  }
}

export class TableBlockComponentWidget extends BlockComponentStatefulWidget {
  readonly tableNode: TableNode;
  readonly menuBuilder?: TableBlockComponentMenuBuilder;
  readonly tableStyle: TableStyle;

  constructor(options: {
    key?: Key;
    tableNode: TableNode;
    node: Node;
    tableStyle?: TableStyle;
    menuBuilder?: TableBlockComponentMenuBuilder;
    showActions?: boolean;
    actionBuilder?: (context: BuildContext, state: any) => Widget;
    actionTrailingBuilder?: (context: BuildContext, state: any) => Widget;
    configuration?: BlockComponentConfiguration;
  }) {
    super({
      key: options.key,
      node: options.node,
      showActions: options.showActions,
      actionBuilder: options.actionBuilder,
      actionTrailingBuilder: options.actionTrailingBuilder,
      configuration: options.configuration ?? new BlockComponentConfiguration(),
    });
    this.tableNode = options.tableNode;
    this.menuBuilder = options.menuBuilder;
    this.tableStyle = options.tableStyle ?? new TableStyle();
  }

  createState(): State<StatefulWidget> {
    return new TableBlockComponentWidgetState();
  }
}

class TableBlockComponentWidgetState extends State<TableBlockComponentWidget>
  implements SelectableMixin, BlockComponentConfigurable {

  get configuration(): BlockComponentConfiguration {
    return this.widget.configuration;
  }

  get node(): Node {
    return this.widget.node;
  }

  private editorState!: EditorState;
  private readonly _scrollController = new ScrollController();
  private readonly tableKey = new GlobalKey();

  initState(): void {
    super.initState();
    this.editorState = this.context.read<EditorState>();
  }

  build(context: BuildContext): Widget {
    let child = new Scrollbar({
      controller: this._scrollController,
      child: new SingleChildScrollView({
        padding: EdgeInsets.only({ top: 10, left: 10, bottom: 4 }),
        controller: this._scrollController,
        scrollDirection: Axis.horizontal,
        child: new TableView({
          tableNode: this.widget.tableNode,
          editorState: this.editorState,
          menuBuilder: this.widget.menuBuilder,
          tableStyle: this.widget.tableStyle,
        }),
      }),
    });

    child = new Padding({
      key: this.tableKey,
      padding: this.padding,
      child: child,
    });

    child = new BlockSelectionContainer({
      node: this.node,
      delegate: this,
      listenable: this.editorState.selectionNotifier,
      remoteSelection: this.editorState.remoteSelections,
      blockColor: this.editorState.editorStyle.selectionColor,
      supportTypes: [BlockSelectionType.block],
      child: child,
    });

    if (this.widget.showActions && this.widget.actionBuilder) {
      child = new BlockComponentActionWrapper({
        node: this.node,
        actionBuilder: this.widget.actionBuilder,
        actionTrailingBuilder: this.widget.actionTrailingBuilder,
        child: child,
      });
    }

    return child;
  }

  get _renderBox(): RenderBox {
    return this.context.findRenderObject() as RenderBox;
  }

  start(): Position {
    return new Position({ path: this.widget.node.path, offset: 0 });
  }

  end(): Position {
    return new Position({ path: this.widget.node.path, offset: 1 });
  }

  getPositionInOffset(start: Offset): Position {
    return this.end();
  }

  getRectsInSelection(
    selection: Selection,
    options: { shiftWithBaseOffset?: boolean } = {}
  ): Rect[] {
    const { shiftWithBaseOffset = false } = options;
    const parentBox = this.context.findRenderObject();
    const tableBox = this.tableKey.currentContext?.findRenderObject();
    if (parentBox instanceof RenderBox && tableBox instanceof RenderBox) {
      return [
        new Rect({
          offset: shiftWithBaseOffset
            ? tableBox.localToGlobal(Offset.zero, { ancestor: parentBox })
            : Offset.zero,
          size: tableBox.size,
        }),
      ];
    }
    return [new Rect({ offset: Offset.zero, size: this._renderBox.size })];
  }

  getSelectionInRange(start: Offset, end: Offset): Selection {
    return Selection.single({
      path: this.widget.node.path,
      startOffset: 0,
      endOffset: 1,
    });
  }

  get shouldCursorBlink(): boolean {
    return false;
  }

  get cursorStyle(): CursorStyle {
    return CursorStyle.cover;
  }

  localToGlobal(
    offset: Offset,
    options: { shiftWithBaseOffset?: boolean } = {}
  ): Offset {
    return this._renderBox.localToGlobal(offset);
  }

  getBlockRect(options: { shiftWithBaseOffset?: boolean } = {}): Rect {
    return this.getRectsInSelection(Selection.invalid())[0];
  }

  getCursorRectInPosition(
    position: Position,
    options: { shiftWithBaseOffset?: boolean } = {}
  ): Rect | undefined {
    const size = this._renderBox.size;
    return Rect.fromLTWH(-size.width / 2.0, 0, size.width, size.height);
  }
}

export const tableMenuItem = new SelectionMenuItem({
  getName: () => AppFlowyEditorL10n.current.table,
  icon: (editorState, isSelected, style) => new SelectionMenuIconWidget({
    icon: Icons.table_view,
    isSelected: isSelected,
    style: style,
  }),
  keywords: ['table'],
  handler: (editorState, _, __) => {
    const selection = editorState.selection;
    if (!selection || !selection.isCollapsed) {
      return;
    }

    const currentNode = editorState.getNodeAtPath(selection.end.path);
    if (!currentNode) {
      return;
    }

    const tableNode = TableNode.fromList([
      ['', ''],
      ['', ''],
    ]);

    const transaction = editorState.transaction;
    const delta = currentNode.delta;
    if (delta && delta.isEmpty) {
      transaction.insertNode(selection.end.path, tableNode.node);
      transaction.deleteNode(currentNode);
      transaction.afterSelection = Selection.collapsed(
        new Position({
          path: [...selection.end.path, 0, 0],
          offset: 0,
        }),
      );
    } else {
      transaction.insertNode(selection.end.path.next, tableNode.node);
      transaction.afterSelection = Selection.collapsed(
        new Position({
          path: [...selection.end.path.next, 0, 0],
          offset: 0,
        }),
      );
    }

    editorState.apply(transaction);
  },
});