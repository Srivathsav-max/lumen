import { Component, ComponentChild } from '../../../../core/component';

export enum NestedListMode {
  stack = 'stack',
  column = 'column',
}

export interface EdgeInsets {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

interface NestedListWidgetProps {
  /// used to indent the nested list when the children's level is greater than 1.
  ///
  /// For example,
  ///
  /// Hello AppFlowy
  ///   Hello AppFlowy
  /// ↑
  /// the indent padding is applied to the second line.
  indentPadding?: EdgeInsets;
  /// The mode of the nested list.
  mode?: NestedListMode;
  child: ComponentChild;
  children: ComponentChild[];
}

export class NestedListWidget extends Component<NestedListWidgetProps> {
  constructor(props: NestedListWidgetProps) {
    super(props);
  }

  render(): ComponentChild {
    const indentPadding = this.props.indentPadding || { left: 28 };
    const mode = this.props.mode || NestedListMode.column;

    switch (mode) {
      case NestedListMode.stack:
        return {
          tag: 'div',
          style: {
            position: 'relative',
          },
          children: [
            this.props.child,
            {
              tag: 'div',
              style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                width: '100%',
              },
              children: this.props.children,
            },
          ],
        };

      case NestedListMode.column:
        return {
          tag: 'div',
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            width: '100%',
          },
          children: [
            this.props.child,
            {
              tag: 'div',
              style: {
                paddingTop: `${indentPadding.top || 0}px`,
                paddingBottom: `${indentPadding.bottom || 0}px`,
                paddingLeft: `${indentPadding.left || 0}px`,
                paddingRight: `${indentPadding.right || 0}px`,
              },
              children: [
                {
                  tag: 'div',
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    width: '100%',
                  },
                  children: this.props.children,
                },
              ],
            },
          ],
        };

      default:
        throw new Error(`Unknown NestedListMode: ${mode}`);
    }
  }
}