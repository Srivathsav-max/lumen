import { StatefulWidget, State, Widget, BuildContext, Key, EdgeInsetsGeometry, Container, MouseRegion, Center, Visibility, Card, SystemMouseCursors, GestureDetector } from '../../../flutter/widgets';

export class TableActionButton extends StatefulWidget {
  readonly width: number;
  readonly height: number;
  readonly padding: EdgeInsetsGeometry;
  readonly onPressed: () => void;
  readonly icon: Widget;

  constructor(options: {
    key?: Key;
    width: number;
    height: number;
    padding: EdgeInsetsGeometry;
    onPressed: () => void;
    icon: Widget;
  }) {
    super(options.key);
    this.width = options.width;
    this.height = options.height;
    this.padding = options.padding;
    this.onPressed = options.onPressed;
    this.icon = options.icon;
  }

  createState(): State<StatefulWidget> {
    return new TableActionButtonState();
  }
}

class TableActionButtonState extends State<TableActionButton> {
  private _visible = false;

  build(context: BuildContext): Widget {
    return new Container({
      padding: this.widget.padding,
      width: this.widget.width,
      height: this.widget.height,
      child: new MouseRegion({
        onEnter: (_) => this.setState(() => this._visible = true),
        onExit: (_) => this.setState(() => this._visible = false),
        child: new Center({
          child: new Visibility({
            visible: this._visible,
            child: new Card({
              elevation: 1.0,
              child: new MouseRegion({
                cursor: SystemMouseCursors.click,
                child: new GestureDetector({
                  onTap: () => this.widget.onPressed(),
                  child: this.widget.icon,
                }),
              }),
            }),
          }),
        }),
      }),
    });
  }
}