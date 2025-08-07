// Alignment extension for text alignment conversion
export enum TextAlign {
  left = 'left',
  center = 'center',
  right = 'right',
  justify = 'justify'
}

export enum Alignment {
  center = 'center',
  centerRight = 'centerRight',
  centerLeft = 'centerLeft'
}

export class AppFlowyTextAlign {
  static toTextAlign(alignment: Alignment): TextAlign {
    switch (alignment) {
      case Alignment.center:
        return TextAlign.center;
      case Alignment.centerRight:
        return TextAlign.right;
      case Alignment.centerLeft:
      default:
        return TextAlign.left;
    }
  }
}