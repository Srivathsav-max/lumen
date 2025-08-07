import { Component, ComponentChild } from '../../../core/component';
import { AppFlowyEditorL10n } from '../../../l10n/l10n';
import { isBase64, isURL } from '../../../core/url_validator';
import { dataFromBase64String } from './base64_image';

const _kImageBlockComponentMinWidth = 30.0;

interface ResizableImageProps {
  src: string;
  width: number;
  height?: number;
  alignment: string;
  editable: boolean;
  onResize: (width: number) => void;
}

interface ResizableImageState {
  imageWidth: number;
  initialOffset: number;
  moveDistance: number;
  onFocus: boolean;
  cacheImage?: HTMLImageElement;
  imageLoaded: boolean;
  imageError: boolean;
}

export class ResizableImage extends Component<ResizableImageProps, ResizableImageState> {
  constructor(props: ResizableImageProps) {
    super(props);
    this.state = {
      imageWidth: props.width,
      initialOffset: 0,
      moveDistance: 0,
      onFocus: false,
      imageLoaded: false,
      imageError: false,
    };
  }

  render(): ComponentChild {
    const finalWidth = Math.max(_kImageBlockComponentMinWidth, this.state.imageWidth - this.state.moveDistance);
    
    return {
      tag: 'div',
      style: {
        display: 'flex',
        justifyContent: this.props.alignment,
        width: '100%',
      },
      children: [
        {
          tag: 'div',
          style: {
            width: `${finalWidth}px`,
            height: this.props.height ? `${this.props.height}px` : 'auto',
            position: 'relative',
          },
          onMouseEnter: () => this.setState({ onFocus: true }),
          onMouseLeave: () => this.setState({ onFocus: false }),
          children: [
            this.buildResizableImage(),
          ],
        },
      ],
    };
  }

  private buildResizableImage(): ComponentChild {
    const src = this.props.src;
    let imageElement: ComponentChild;

    if (isBase64(src)) {
      // load base64 image
      imageElement = {
        tag: 'img',
        src: `data:image/png;base64,${src}`,
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        },
        onLoad: () => this.setState({ imageLoaded: true }),
        onError: () => this.setState({ imageError: true }),
      };
    } else if (isURL(src)) {
      // load network image
      if (!this.state.imageLoaded && !this.state.imageError) {
        imageElement = this.buildLoading();
      } else if (this.state.imageError) {
        imageElement = this.buildError();
      } else {
        imageElement = {
          tag: 'img',
          src: this.props.src,
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          },
          onLoad: () => this.setState({ imageLoaded: true }),
          onError: () => this.setState({ imageError: true }),
        };
      }
    } else {
      // load local file (in web context, this would be a blob URL)
      imageElement = {
        tag: 'img',
        src: src,
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        },
        onLoad: () => this.setState({ imageLoaded: true }),
        onError: () => this.setState({ imageError: true }),
      };
    }

    const children: ComponentChild[] = [imageElement];

    if (this.props.editable) {
      children.push(
        this.buildEdgeGesture({
          top: 0,
          left: 5,
          bottom: 0,
          width: 5,
          onUpdate: (distance) => {
            this.setState({ moveDistance: distance });
          },
        }),
        this.buildEdgeGesture({
          top: 0,
          right: 5,
          bottom: 0,
          width: 5,
          onUpdate: (distance) => {
            this.setState({ moveDistance: -distance });
          },
        }),
      );
    }

    return {
      tag: 'div',
      style: {
        position: 'relative',
        width: '100%',
        height: '100%',
      },
      children,
    };
  }

  private buildLoading(): ComponentChild {
    return {
      tag: 'div',
      style: {
        height: '150px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
      },
      children: [
        {
          tag: 'div',
          style: {
            width: '18px',
            height: '18px',
            border: '2px solid #f3f3f3',
            borderTop: '2px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          },
        },
        {
          tag: 'span',
          textContent: AppFlowyEditorL10n.current.loading,
        },
      ],
    };
  }

  private buildError(): ComponentChild {
    return {
      tag: 'div',
      style: {
        height: '100px',
        width: `${this.state.imageWidth}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        border: '1px solid black',
        borderRadius: '4px',
      },
      children: [
        {
          tag: 'span',
          textContent: AppFlowyEditorL10n.current.imageLoadFailed,
        },
      ],
    };
  }

  private buildEdgeGesture(options: {
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
    width?: number;
    onUpdate?: (distance: number) => void;
  }): ComponentChild {
    return {
      tag: 'div',
      style: {
        position: 'absolute',
        top: options.top !== undefined ? `${options.top}px` : undefined,
        left: options.left !== undefined ? `${options.left}px` : undefined,
        right: options.right !== undefined ? `${options.right}px` : undefined,
        bottom: options.bottom !== undefined ? `${options.bottom}px` : undefined,
        width: options.width !== undefined ? `${options.width}px` : undefined,
        cursor: 'ew-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      onMouseDown: (event: MouseEvent) => {
        this.setState({ initialOffset: event.clientX });
        
        const handleMouseMove = (moveEvent: MouseEvent) => {
          if (options.onUpdate) {
            let offset = moveEvent.clientX - this.state.initialOffset;
            if (this.props.alignment === 'center') {
              offset *= 2.0;
            }
            options.onUpdate(offset);
          }
        };

        const handleMouseUp = () => {
          const newWidth = Math.max(_kImageBlockComponentMinWidth, this.state.imageWidth - this.state.moveDistance);
          this.setState({
            imageWidth: newWidth,
            initialOffset: 0,
            moveDistance: 0,
          });
          this.props.onResize(newWidth);
          
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      },
      children: [
        this.state.onFocus ? {
          tag: 'div',
          style: {
            height: '40px',
            width: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: '5px',
            border: '1px solid white',
          },
        } : null,
      ].filter(Boolean),
    };
  }
}