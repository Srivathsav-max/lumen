import { MobileToolbarTheme } from '../mobile_toolbar_style';

export interface SliverGridDelegate {
  getLayout(constraints: SliverConstraints): SliverGridLayout;
  shouldRelayout(oldDelegate: SliverGridDelegate): boolean;
}

export interface SliverConstraints {
  crossAxisExtent: number;
  crossAxisDirection: AxisDirection;
}

export interface SliverGridLayout {
  crossAxisCount: number;
  mainAxisStride: number;
  crossAxisStride: number;
  childMainAxisExtent: number;
  childCrossAxisExtent: number;
  reverseCrossAxis: boolean;
}

export enum AxisDirection {
  up = 'up',
  right = 'right',
  down = 'down',
  left = 'left'
}

export function buildMobileToolbarMenuGridDelegate(options: {
  mobileToolbarStyle: MobileToolbarTheme;
  crossAxisCount: number;
}): SliverGridDelegate {
  const { mobileToolbarStyle, crossAxisCount } = options;
  
  return new SliverGridDelegateWithFixedCrossAxisCountAndFixedHeight({
    crossAxisCount,
    mainAxisSpacing: mobileToolbarStyle.buttonSpacing,
    crossAxisSpacing: mobileToolbarStyle.buttonSpacing,
    height: mobileToolbarStyle.buttonHeight
  });
}

export class SliverGridDelegateWithFixedCrossAxisCountAndFixedHeight implements SliverGridDelegate {
  crossAxisCount: number;
  mainAxisSpacing: number;
  crossAxisSpacing: number;
  height: number;

  constructor(options: {
    crossAxisCount: number;
    mainAxisSpacing?: number;
    crossAxisSpacing?: number;
    height?: number;
  }) {
    const { crossAxisCount, mainAxisSpacing = 0.0, crossAxisSpacing = 0.0, height = 56.0 } = options;
    
    if (crossAxisCount <= 0) throw new Error('crossAxisCount must be greater than 0');
    if (mainAxisSpacing < 0) throw new Error('mainAxisSpacing must not be negative');
    if (crossAxisSpacing < 0) throw new Error('crossAxisSpacing must not be negative');
    if (height <= 0) throw new Error('height must be greater than 0');

    this.crossAxisCount = crossAxisCount;
    this.mainAxisSpacing = mainAxisSpacing;
    this.crossAxisSpacing = crossAxisSpacing;
    this.height = height;
  }

  private debugAssertIsValid(): boolean {
    if (this.crossAxisCount <= 0) throw new Error('crossAxisCount must be greater than 0');
    if (this.mainAxisSpacing < 0) throw new Error('mainAxisSpacing must not be negative');
    if (this.crossAxisSpacing < 0) throw new Error('crossAxisSpacing must not be negative');
    if (this.height <= 0) throw new Error('height must be greater than 0');
    return true;
  }

  getLayout(constraints: SliverConstraints): SliverGridLayout {
    this.debugAssertIsValid();
    
    const usableCrossAxisExtent = constraints.crossAxisExtent - this.crossAxisSpacing * (this.crossAxisCount - 1);
    const childCrossAxisExtent = usableCrossAxisExtent / this.crossAxisCount;
    const childMainAxisExtent = this.height;
    
    return {
      crossAxisCount: this.crossAxisCount,
      mainAxisStride: childMainAxisExtent + this.mainAxisSpacing,
      crossAxisStride: childCrossAxisExtent + this.crossAxisSpacing,
      childMainAxisExtent,
      childCrossAxisExtent,
      reverseCrossAxis: this.axisDirectionIsReversed(constraints.crossAxisDirection)
    };
  }

  shouldRelayout(oldDelegate: SliverGridDelegateWithFixedCrossAxisCountAndFixedHeight): boolean {
    return oldDelegate.crossAxisCount !== this.crossAxisCount ||
           oldDelegate.mainAxisSpacing !== this.mainAxisSpacing ||
           oldDelegate.crossAxisSpacing !== this.crossAxisSpacing ||
           oldDelegate.height !== this.height;
  }

  private axisDirectionIsReversed(direction: AxisDirection): boolean {
    return direction === AxisDirection.up || direction === AxisDirection.left;
  }
}