import { AutoScroller } from './auto_scroller';

interface AutoScrollableWidgetProps {
  shrinkWrap?: boolean;
  scrollController: HTMLElement;
  builder: (context: any, autoScroller: AutoScroller) => HTMLElement;
}

export class AutoScrollableWidget {
  private props: AutoScrollableWidgetProps;
  private autoScroller: AutoScroller;
  private scrollableState: HTMLElement;
  private element: HTMLElement;

  constructor(props: AutoScrollableWidgetProps) {
    this.props = {
      shrinkWrap: false,
      ...props
    };
    this.scrollableState = this.props.scrollController;
    this.initAutoScroller();
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    if (this.props.shrinkWrap) {
      return this.props.builder(null, this.autoScroller);
    } else {
      const container = document.createElement('div');
      container.className = 'auto-scrollable-widget';
      container.style.position = 'relative';
      container.style.width = '100%';
      container.style.height = '100%';
      
      const child = this.props.builder(null, this.autoScroller);
      container.appendChild(child);
      return container;
    }
  }

  private initAutoScroller(): void {
    const velocityScalar = this.isDesktopOrWeb() ? 25 : 100;
    
    this.autoScroller = new AutoScroller(this.scrollableState, {
      velocityScalar,
      onScrollViewScrolled: () => {
        // this.autoScroller.continueToAutoScroll();
      },
    });
  }

  private isDesktopOrWeb(): boolean {
    return !(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }

  getElement(): HTMLElement {
    return this.element;
  }

  getAutoScroller(): AutoScroller {
    return this.autoScroller;
  }

  destroy(): void {
    this.autoScroller.stopAutoScroll();
  }
}