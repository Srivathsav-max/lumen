import { MobileToolbarThemeData } from '../mobile_toolbar_style';

export interface GridDelegateConfig {
  crossAxisCount: number;
  mainAxisSpacing: number;
  crossAxisSpacing: number;
  height: number;
}

export function buildMobileToolbarMenuGridDelegate(options: {
  mobileToolbarStyle: MobileToolbarThemeData;
  crossAxisCount: number;
}): GridDelegateConfig {
  const { mobileToolbarStyle, crossAxisCount } = options;
  
  return {
    crossAxisCount,
    mainAxisSpacing: mobileToolbarStyle.buttonSpacing,
    crossAxisSpacing: mobileToolbarStyle.buttonSpacing,
    height: mobileToolbarStyle.buttonHeight,
  };
}

export interface GridLayoutCalculator {
  crossAxisCount: number;
  mainAxisSpacing: number;
  crossAxisSpacing: number;
  height: number;
}

export class MobileToolbarMenuGridDelegate implements GridLayoutCalculator {
  constructor(
    public crossAxisCount: number,
    public mainAxisSpacing: number = 0,
    public crossAxisSpacing: number = 0,
    public height: number = 56
  ) {
    if (crossAxisCount <= 0) {
      throw new Error('crossAxisCount must be greater than 0');
    }
    if (mainAxisSpacing < 0) {
      throw new Error('mainAxisSpacing must not be negative');
    }
    if (crossAxisSpacing < 0) {
      throw new Error('crossAxisSpacing must not be negative');
    }
    if (height <= 0) {
      throw new Error('height must be greater than 0');
    }
  }

  getLayout(constraints: { crossAxisExtent: number }) {
    const usableCrossAxisExtent = 
      constraints.crossAxisExtent - this.crossAxisSpacing * (this.crossAxisCount - 1);
    const childCrossAxisExtent = usableCrossAxisExtent / this.crossAxisCount;
    const childMainAxisExtent = this.height;

    return {
      crossAxisCount: this.crossAxisCount,
      mainAxisStride: childMainAxisExtent + this.mainAxisSpacing,
      crossAxisStride: childCrossAxisExtent + this.crossAxisSpacing,
      childMainAxisExtent,
      childCrossAxisExtent,
    };
  }

  shouldRelayout(oldDelegate: MobileToolbarMenuGridDelegate): boolean {
    return oldDelegate.crossAxisCount !== this.crossAxisCount ||
           oldDelegate.mainAxisSpacing !== this.mainAxisSpacing ||
           oldDelegate.crossAxisSpacing !== this.crossAxisSpacing ||
           oldDelegate.height !== this.height;
  }
}