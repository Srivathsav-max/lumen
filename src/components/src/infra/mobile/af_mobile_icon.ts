export interface MobileIconProps {
  icon: string;
  size?: number;
  color?: string;
}

export class AFMobileIcon {
  private readonly props: MobileIconProps;

  constructor(props: MobileIconProps) {
    this.props = props;
  }

  build(): any {
    return {
      type: 'mobile-icon',
      icon: this.props.icon,
      size: this.props.size ?? 24,
      color: this.props.color,
    };
  }

  // Static factory methods for common icons
  static add(options: Omit<MobileIconProps, 'icon'> = {}): AFMobileIcon {
    return new AFMobileIcon({ ...options, icon: 'add' });
  }

  static close(options: Omit<MobileIconProps, 'icon'> = {}): AFMobileIcon {
    return new AFMobileIcon({ ...options, icon: 'close' });
  }

  static edit(options: Omit<MobileIconProps, 'icon'> = {}): AFMobileIcon {
    return new AFMobileIcon({ ...options, icon: 'edit' });
  }

  static delete(options: Omit<MobileIconProps, 'icon'> = {}): AFMobileIcon {
    return new AFMobileIcon({ ...options, icon: 'delete' });
  }

  static more(options: Omit<MobileIconProps, 'icon'> = {}): AFMobileIcon {
    return new AFMobileIcon({ ...options, icon: 'more' });
  }
}