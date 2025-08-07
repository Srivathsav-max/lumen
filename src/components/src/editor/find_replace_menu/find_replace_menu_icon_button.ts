import { StatelessWidget, Widget, BuildContext, Key, VoidCallback, SizedBox, IconButton } from '../../../flutter/widgets';

const ICON_BUTTON_SIZE = 30;
const ICON_SIZE = 15;

export class FindAndReplaceMenuIconButton extends StatelessWidget {
  readonly icon: Widget;
  readonly onPressed?: VoidCallback;
  readonly iconSize?: number;
  readonly tooltip?: string;
  readonly iconButtonKey?: Key;

  constructor(options: {
    key?: Key;
    icon: Widget;
    onPressed?: VoidCallback;
    iconSize?: number;
    tooltip?: string;
    iconButtonKey?: Key;
  }) {
    super(options.key);
    this.icon = options.icon;
    this.onPressed = options.onPressed;
    this.iconSize = options.iconSize;
    this.tooltip = options.tooltip;
    this.iconButtonKey = options.iconButtonKey;
  }

  build(context: BuildContext): Widget {
    return new SizedBox({
      width: ICON_BUTTON_SIZE,
      height: ICON_BUTTON_SIZE,
      child: new IconButton({
        key: this.iconButtonKey,
        onPressed: this.onPressed,
        icon: this.icon,
        iconSize: this.iconSize ?? ICON_SIZE,
        tooltip: this.tooltip,
      }),
    });
  }
}