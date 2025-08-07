import { StatefulWidget, State, Widget, BuildContext, Key, Alignment, Matrix4, Container, Visibility, MouseRegion, Card, SystemMouseCursors, GestureDetector, Transform } from '../../../flutter/widgets';
import { Node } from '../../node';
import { EditorState } from '../../editor_state';
import { TableDirection, TableBlockComponentMenuBuilder, TableDefaults } from './table_block_component';
import { showActionMenu } from './table_action_menu';

export class TableActionHandler extends StatefulWidget {
  readonly visible: boolean;
  readonly node: Node;
  readonly editorState: EditorState;
  readonly position: number;
  readonly alignment: Alignment;
  readonly transform: Matrix4;
  readonly height?: number;
  readonly dir: TableDirection;
  readonly menuBuilder?: TableBlockComponentMenuBuilder;

  constructor(options: {
    key?: Key;
    visible?: boolean;
    height?: number;
    node: Node;
    editorState: EditorState;
    position: number;
    alignment: Alignment;
    transform: Matrix4;
    dir: TableDirection;
    menuBuilder?: TableBlockComponentMenuBuilder;
  }) {
    super(options.key);
    this.visible = options.visible ?? false;
    this.node = options.node;
    this.editorState = options.editorState;
    this.position = options.position;
    this.alignment = options.alignment;
    this.transform = options.transform;
    this.height = options.height;
    this.dir = options.dir;
    this.menuBuilder = options.menuBuilder;
  }

  createState(): State<StatefulWidget> {
    return new TableActionHandlerState();
  }
}

class TableActionHandlerState extends State<TableActionHandler> {
  private _visible = false;
  private _menuShown = false;

  build(context: BuildContext): Widget {
    return new Container({
      alignment: this.widget.alignment,
      transform: this.widget.transform,
      height: this.widget.height,
      child: new Visibility({
        visible: (this.widget.visible || this._visible || this._menuShown) &&
          this.widget.editorState.editable,
        child: new MouseRegion({
          onEnter: (_) => this.setState(() => this._visible = true),
          onExit: (_) => this.setState(() => this._visible = false),
          child: this.widget.menuBuilder
            ? this.widget.menuBuilder(
                this.widget.node,
                this.widget.editorState,
                this.widget.position,
                this.widget.dir,
                () => this._menuShown = true,
                () => this.setState(() => this._menuShown = false),
              )
            : defaultMenuBuilder(
                context,
                this.widget.node,
                this.widget.editorState,
                this.widget.position,
                this.widget.dir,
              ),
        }),
      }),
    });
  }
}

export function defaultMenuBuilder(
  context: BuildContext,
  node: Node,
  editorState: EditorState,
  position: number,
  dir: TableDirection,
): Widget {
  return new Card({
    elevation: 3.0,
    child: new MouseRegion({
      cursor: SystemMouseCursors.click,
      child: new GestureDetector({
        onTap: () => showActionMenu(
          context,
          node,
          editorState,
          position,
          dir,
        ),
        child: dir === TableDirection.col
          ? new Transform({
              transform: Matrix4.rotationZ(Math.PI / 2),
              child: TableDefaults.handlerIcon,
            })
          : TableDefaults.handlerIcon,
      }),
    }),
  });
}