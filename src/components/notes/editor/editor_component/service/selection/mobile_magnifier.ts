import { StatelessWidget, Widget, BuildContext, Key, Size, Offset, Positioned, Rect, IgnorePointer, RawMagnifier, MagnifierDecoration, RoundedRectangleBorder, BorderRadius, Radius, BoxShadow, ColoredBox, Color } from '../../../../flutter/widgets';

export class MobileMagnifier extends StatelessWidget {
  readonly size: Size;
  readonly offset: Offset;

  constructor(options: {
    key?: Key;
    size: Size;
    offset: Offset;
  }) {
    super(options.key);
    this.size = options.size;
    this.offset = options.offset;
  }

  build(context: BuildContext): Widget {
    // the magnifier will blink if the center is the same as the offset.
    const magicOffset = new Offset(0, this.size.height - 22);
    return new Positioned({
      rect: Rect.fromCenter({
        center: this.offset.subtract(magicOffset),
        width: this.size.width,
        height: this.size.height,
      }),
      child: new IgnorePointer({
        child: new CustomMagnifier({
          size: this.size,
          additionalFocalPointOffset: magicOffset,
        }),
      }),
    });
  }
}

class CustomMagnifier extends StatelessWidget {
  readonly size: Size;
  readonly additionalFocalPointOffset: Offset;

  constructor(options: {
    size: Size;
    additionalFocalPointOffset?: Offset;
  }) {
    super();
    this.size = options.size;
    this.additionalFocalPointOffset = options.additionalFocalPointOffset ?? Offset.zero;
  }

  build(context: BuildContext): Widget {
    return new RawMagnifier({
      decoration: new MagnifierDecoration({
        shape: new RoundedRectangleBorder({
          borderRadius: BorderRadius.all(new Radius.circular(40)),
        }),
        shadows: [
          new BoxShadow({
            blurRadius: 1.5,
            offset: new Offset(0, 2),
            spreadRadius: 0.75,
            color: Color.fromARGB(25, 0, 0, 0),
          }),
        ],
      }),
      magnificationScale: 1.25,
      focalPointOffset: this.additionalFocalPointOffset,
      size: this.size,
      child: new ColoredBox({
        color: Color.fromARGB(8, 158, 158, 158),
      }),
    });
  }
}