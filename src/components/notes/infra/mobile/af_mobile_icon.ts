// Mobile icon component for AppFlowy editor toolbar
export enum AFMobileIcons {
  textDecoration = 'toolbar_icons/text_decoration',
  bold = 'toolbar_icons/bold',
  italic = 'toolbar_icons/italic',
  underline = 'toolbar_icons/underline',
  strikethrough = 'toolbar_icons/strikethrough',
  code = 'toolbar_icons/code',
  color = 'toolbar_icons/color',
  link = 'toolbar_icons/link',
  heading = 'toolbar_icons/heading',
  h1 = 'toolbar_icons/h1',
  h2 = 'toolbar_icons/h2',
  h3 = 'toolbar_icons/h3',
  list = 'toolbar_icons/list',
  bulletedList = 'toolbar_icons/bulleted_list',
  numberedList = 'toolbar_icons/numbered_list',
  checkbox = 'toolbar_icons/checkbox',
  quote = 'toolbar_icons/quote',
  divider = 'toolbar_icons/divider',
  close = 'toolbar_icons/close'
}

export interface AFMobileIconProps {
  afMobileIcons: AFMobileIcons;
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Mobile icon component for AppFlowy editor
 * 
 * @example
 * ```tsx
 * <AFMobileIcon
 *   afMobileIcons={AFMobileIcons.bold}
 *   size={24}
 *   color="#000000"
 * />
 * ```
 */
export class AFMobileIcon {
  static create(props: AFMobileIconProps): HTMLElement {
    const { afMobileIcons, size = 24, color, className } = props;
    
    const container = document.createElement('div');
    container.className = className || '';
    container.style.display = 'inline-block';
    container.style.width = `${size}px`;
    container.style.height = `${size}px`;

    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size.toString());
    svg.setAttribute('height', size.toString());
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.style.fill = color || 'currentColor';

    // Load SVG content from assets
    this.loadSvgContent(afMobileIcons, svg);

    container.appendChild(svg);
    return container;
  }

  private static async loadSvgContent(iconPath: AFMobileIcons, svgElement: SVGElement): Promise<void> {
    try {
      const response = await fetch(`/assets/mobile/${iconPath}.svg`);
      if (response.ok) {
        const svgContent = await response.text();
        // Parse and insert SVG content
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
        const svgRoot = svgDoc.documentElement;
        
        // Copy attributes and children from loaded SVG
        Array.from(svgRoot.children).forEach(child => {
          svgElement.appendChild(child.cloneNode(true));
        });
      } else {
        console.warn(`Failed to load SVG icon: ${iconPath}`);
        this.createFallbackIcon(svgElement);
      }
    } catch (error) {
      console.error(`Error loading SVG icon: ${iconPath}`, error);
      this.createFallbackIcon(svgElement);
    }
  }

  private static createFallbackIcon(svgElement: SVGElement): void {
    // Create a simple fallback icon (square)
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '4');
    rect.setAttribute('y', '4');
    rect.setAttribute('width', '16');
    rect.setAttribute('height', '16');
    rect.setAttribute('rx', '2');
    rect.setAttribute('fill', 'currentColor');
    svgElement.appendChild(rect);
  }

  /**
   * React-style component function for use in React applications
   */
  static Component = (props: AFMobileIconProps) => {
    return AFMobileIcon.create(props);
  };
}