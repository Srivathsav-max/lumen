export interface EditorSvgProps {
  name?: string;
  width?: number;
  height?: number;
  color?: string;
  number?: number;
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export class EditorSvg {
  private readonly props: EditorSvgProps;
  private readonly defaultWidth = 20.0;
  private readonly defaultHeight = 20.0;

  constructor(props: EditorSvgProps = {}) {
    this.props = props;
  }

  // In a web environment, this would return JSX or a DOM element
  // For now, returning a simple object representation
  build(context?: any): any {
    const scaleFactor = context?.editorState?.editorStyle?.textScaleFactor ?? 1.0;
    const height = (this.props.height ?? this.defaultHeight) * scaleFactor;
    const width = (this.props.width ?? this.defaultWidth) * scaleFactor;

    return this.buildSvg(height, width);
  }

  private buildSvg(height: number, width: number): any {
    if (this.props.name) {
      return {
        type: 'svg',
        src: `assets/images/${this.props.name}.svg`,
        width,
        height,
        color: this.props.color,
        padding: this.props.padding,
      };
    } else if (this.props.number !== undefined) {
      const numberText = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><text x="30" y="150" fill="black" font-size="160">${this.props.number}.</text></svg>`;
      return {
        type: 'svg',
        content: numberText,
        width,
        height,
      };
    }

    return {
      type: 'container',
      width: 0,
      height: 0,
    };
  }

  // Static factory methods for common use cases
  static icon(name: string, options: Omit<EditorSvgProps, 'name'> = {}): EditorSvg {
    return new EditorSvg({ ...options, name });
  }

  static number(number: number, options: Omit<EditorSvgProps, 'number'> = {}): EditorSvg {
    return new EditorSvg({ ...options, number });
  }
}