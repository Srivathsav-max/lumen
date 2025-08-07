import { Component, ComponentChild } from '../../../../core/component';
import { deepEqual } from '../../../../core/utils';

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface AnimatedSelectionAreaPaintProps {
  rects: Rect[];
  withAnimation?: boolean;
}

interface AnimatedSelectionAreaPaintState {
  animationValue: number;
}

export class AnimatedSelectionAreaPaint extends Component<AnimatedSelectionAreaPaintProps, AnimatedSelectionAreaPaintState> {
  private animationId?: number;
  private startTime?: number;

  constructor(props: AnimatedSelectionAreaPaintProps) {
    super(props);
    this.state = {
      animationValue: 0,
    };
  }

  componentDidMount(): void {
    if (this.props.withAnimation) {
      this.startAnimation();
    }
  }

  componentWillUnmount(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  render(): ComponentChild {
    return new AnimatedSelectionAreaPainter({
      colors: [
        'rgb(65, 88, 208)',
        'rgb(200, 80, 192)',
        'rgb(255, 204, 112)',
      ],
      animation: this.props.withAnimation ? this.state.animationValue : 1.0,
      rects: this.props.rects,
    });
  }

  private startAnimation(): void {
    this.startTime = performance.now();
    const animate = (currentTime: number) => {
      if (!this.startTime) return;
      
      const elapsed = currentTime - this.startTime;
      const duration = 4000; // 4 seconds
      const progress = (elapsed % duration) / duration;
      
      // Bounce in out curve approximation
      const bounceValue = this.bounceInOut(progress);
      
      this.setState({ animationValue: bounceValue });
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    this.animationId = requestAnimationFrame(animate);
  }

  private bounceInOut(t: number): number {
    if (t < 0.5) {
      return 0.5 * this.bounceIn(t * 2);
    }
    return 0.5 * this.bounceOut(t * 2 - 1) + 0.5;
  }

  private bounceIn(t: number): number {
    return 1 - this.bounceOut(1 - t);
  }

  private bounceOut(t: number): number {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  }
}

interface SelectionAreaPaintProps {
  rects: Rect[];
  selectionColor: string;
}

export class SelectionAreaPaint extends Component<SelectionAreaPaintProps> {
  render(): ComponentChild {
    return new SelectionAreaPainter({
      rects: this.props.rects,
      selectionColor: this.props.selectionColor,
    });
  }
}

interface SelectionAreaPainterProps {
  rects: Rect[];
  selectionColor: string;
}

export class SelectionAreaPainter extends Component<SelectionAreaPainterProps> {
  render(): ComponentChild {
    return {
      tag: 'svg',
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      },
      children: this.props.rects.map((rect, index) => {
        // if rect.width is 0, we draw a small rect to indicate the selection area
        const width = rect.width <= 0 ? 8.0 : rect.width;
        
        return {
          tag: 'rect',
          key: index.toString(),
          attributes: {
            x: rect.left.toString(),
            y: rect.top.toString(),
            width: width.toString(),
            height: rect.height.toString(),
            fill: this.props.selectionColor,
          },
        };
      }),
    };
  }

  shouldRepaint(oldProps: SelectionAreaPainterProps): boolean {
    return this.props.selectionColor !== oldProps.selectionColor ||
        !deepEqual(this.props.rects, oldProps.rects);
  }
}

interface AnimatedSelectionAreaPainterProps {
  rects: Rect[];
  colors: string[];
  animation: number;
}

export class AnimatedSelectionAreaPainter extends Component<AnimatedSelectionAreaPainterProps> {
  render(): ComponentChild {
    return {
      tag: 'svg',
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      },
      children: [
        {
          tag: 'defs',
          children: [
            {
              tag: 'linearGradient',
              attributes: {
                id: 'animatedGradient',
                gradientTransform: `rotate(${this.props.animation * 360})`,
              },
              children: this.props.colors.map((color, index) => ({
                tag: 'stop',
                attributes: {
                  offset: `${(index / (this.props.colors.length - 1)) * 100}%`,
                  'stop-color': color,
                },
              })),
            },
          ],
        },
        ...this.props.rects.map((rect, index) => ({
          tag: 'rect',
          key: index.toString(),
          attributes: {
            x: rect.left.toString(),
            y: rect.top.toString(),
            width: rect.width.toString(),
            height: rect.height.toString(),
            fill: 'url(#animatedGradient)',
          },
        })),
      ],
    };
  }

  shouldRepaint(oldProps: AnimatedSelectionAreaPainterProps): boolean {
    return this.props.animation !== oldProps.animation ||
        !deepEqual(this.props.colors, oldProps.colors) ||
        !deepEqual(this.props.rects, oldProps.rects);
  }
}