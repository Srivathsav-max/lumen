import { basicOverlay, EditorOverlayTitle, buildOverlayButtonStyle } from '../utils/overlay_util';
import { AppFlowyEditorL10n } from '../../../../../l10n/l10n';

export interface ColorOption {
  name: string;
  colorHex: string;
}

export class ColorPicker {
  private title: string;
  private selectedColorHex?: string;
  private customColorHex?: string;
  private onSubmittedColorHex: (color: string | null, isCustomColor: boolean) => void;
  private resetText?: string;
  private resetIconName?: string;
  private showClearButton: boolean;
  private colorOptions: ColorOption[];
  private colorHexController: HTMLInputElement;
  private colorOpacityController: HTMLInputElement;

  constructor(options: {
    title: string;
    selectedColorHex?: string;
    customColorHex?: string;
    onSubmittedColorHex: (color: string | null, isCustomColor: boolean) => void;
    resetText?: string;
    resetIconName?: string;
    showClearButton?: boolean;
    colorOptions: ColorOption[];
  }) {
    this.title = options.title;
    this.selectedColorHex = options.selectedColorHex;
    this.customColorHex = options.customColorHex;
    this.onSubmittedColorHex = options.onSubmittedColorHex;
    this.resetText = options.resetText;
    this.resetIconName = options.resetIconName;
    this.showClearButton = options.showClearButton ?? false;
    this.colorOptions = options.colorOptions;

    this.colorHexController = document.createElement('input');
    this.colorOpacityController = document.createElement('input');
    
    this.initializeControllers();
  }

  private initializeControllers(): void {
    const selectedColorHex = this.selectedColorHex;
    const customColorHex = this.customColorHex;
    
    this.colorHexController.value = this.extractColorHex(customColorHex ?? selectedColorHex) ?? 'FFFFFF';
    this.colorOpacityController.value = this.convertHexToOpacity(customColorHex ?? selectedColorHex) ?? '100';
  }

  render(context: HTMLElement): HTMLElement {
    const children: HTMLElement[] = [];
    
    // Title
    children.push(new EditorOverlayTitle({ text: this.title }).render());
    
    // Spacing
    const spacing1 = document.createElement('div');
    spacing1.style.height = '6px';
    children.push(spacing1);
    
    // Reset button
    if (this.showClearButton && this.resetText && this.resetIconName) {
      children.push(new ResetColorButton({
        resetText: this.resetText,
        resetIconName: this.resetIconName,
        onPressed: (color) => this.onSubmittedColorHex(color, false)
      }).render(context));
    }
    
    // Custom color item
    children.push(new CustomColorItem({
      colorController: this.colorHexController,
      opacityController: this.colorOpacityController,
      onSubmittedColorHex: (color) => this.onSubmittedColorHex(color, true)
    }).render(context));
    
    // Color items
    children.push(this.buildColorItems(this.colorOptions, this.selectedColorHex, context));
    
    return basicOverlay(context, {
      width: 300,
      height: 250,
      children
    });
  }

  private buildColorItems(options: ColorOption[], selectedColor?: string, context?: HTMLElement): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    `;
    
    options.forEach(option => {
      container.appendChild(this.buildColorItem(option, option.colorHex === selectedColor, context!));
    });
    
    return container;
  }

  private buildColorItem(option: ColorOption, isChecked: boolean, context: HTMLElement): HTMLElement {
    const button = document.createElement('button');
    button.style.cssText = `
      height: 36px;
      width: 100%;
      display: flex;
      align-items: center;
      padding: 8px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 4px;
    `;
    
    // Apply hover styles
    const buttonStyle = buildOverlayButtonStyle(context);
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = buttonStyle.hoverBackgroundColor;
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = buttonStyle.backgroundColor;
    });
    
    button.addEventListener('click', () => {
      this.onSubmittedColorHex(option.colorHex, false);
    });
    
    // Color circle
    const colorCircle = document.createElement('div');
    colorCircle.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: ${this.tryToColor(option.colorHex)};
      margin-right: 8px;
    `;
    
    // Label
    const label = document.createElement('span');
    label.textContent = option.name;
    label.style.cssText = `
      flex: 1;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    
    // Checkmark
    const checkmark = document.createElement('span');
    if (isChecked) {
      checkmark.textContent = '✓';
      checkmark.style.color = '#007AFF';
    }
    
    button.appendChild(colorCircle);
    button.appendChild(label);
    button.appendChild(checkmark);
    
    return button;
  }

  private convertHexToOpacity(colorHex?: string): string | null {
    if (!colorHex) return null;
    const opacityHex = colorHex.substring(2, 4);
    const opacity = parseInt(opacityHex, 16) / 2.55;
    return opacity.toFixed(0);
  }

  private extractColorHex(colorHex?: string): string | null {
    if (!colorHex) return null;
    return colorHex.substring(4);
  }

  private tryToColor(colorHex: string): string {
    // Simple color conversion - in a real implementation you'd want more robust color parsing
    if (colorHex.startsWith('#')) return colorHex;
    if (colorHex.startsWith('0x')) {
      const hex = colorHex.substring(2);
      if (hex.length === 8) {
        // ARGB format, convert to RGBA
        const a = hex.substring(0, 2);
        const rgb = hex.substring(2);
        return `#${rgb}${a}`;
      }
      return `#${hex}`;
    }
    return `#${colorHex}`;
  }
}

class ResetColorButton {
  private resetText: string;
  private resetIconName: string;
  private onPressed: (color: string | null) => void;

  constructor(options: {
    resetText: string;
    resetIconName: string;
    onPressed: (color: string | null) => void;
  }) {
    this.resetText = options.resetText;
    this.resetIconName = options.resetIconName;
    this.onPressed = options.onPressed;
  }

  render(context: HTMLElement): HTMLElement {
    const button = document.createElement('button');
    button.style.cssText = `
      width: 100%;
      height: 32px;
      display: flex;
      align-items: center;
      padding: 8px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 4px;
      text-align: left;
    `;
    
    const buttonStyle = buildOverlayButtonStyle(context);
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = buttonStyle.hoverBackgroundColor;
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = buttonStyle.backgroundColor;
    });
    
    button.addEventListener('click', () => this.onPressed(null));
    
    // Icon (simplified - in real implementation you'd load SVG)
    const icon = document.createElement('span');
    icon.textContent = '↺'; // Reset icon placeholder
    icon.style.cssText = `
      width: 13px;
      height: 13px;
      margin-right: 8px;
      color: #666;
    `;
    
    // Text
    const text = document.createElement('span');
    text.textContent = this.resetText;
    text.style.cssText = `
      color: #666;
      text-align: left;
    `;
    
    button.appendChild(icon);
    button.appendChild(text);
    
    return button;
  }
}

class CustomColorItem {
  private colorController: HTMLInputElement;
  private opacityController: HTMLInputElement;
  private onSubmittedColorHex: (color: string) => void;
  private isExpanded: boolean = false;

  constructor(options: {
    colorController: HTMLInputElement;
    opacityController: HTMLInputElement;
    onSubmittedColorHex: (color: string) => void;
  }) {
    this.colorController = options.colorController;
    this.opacityController = options.opacityController;
    this.onSubmittedColorHex = options.onSubmittedColorHex;
  }

  render(context: HTMLElement): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      width: 100%;
      border: 1px solid transparent;
    `;
    
    // Title row
    const titleRow = document.createElement('div');
    titleRow.style.cssText = `
      display: flex;
      align-items: center;
      padding: 8px;
      cursor: pointer;
    `;
    
    titleRow.addEventListener('click', () => {
      this.isExpanded = !this.isExpanded;
      this.updateExpansion(container);
    });
    
    // Color sample
    const colorSample = document.createElement('div');
    colorSample.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 8px;
    `;
    this.updateColorSample(colorSample);
    
    // Label
    const label = document.createElement('span');
    label.textContent = AppFlowyEditorL10n.current.customColor;
    label.style.flex = '1';
    
    titleRow.appendChild(colorSample);
    titleRow.appendChild(label);
    container.appendChild(titleRow);
    
    // Details (initially hidden)
    const details = document.createElement('div');
    details.style.display = 'none';
    details.style.padding = '8px';
    
    // Hex input
    const hexField = this.createTextField({
      labelText: AppFlowyEditorL10n.current.hexValue,
      controller: this.colorController,
      onChanged: () => this.updateColorSample(colorSample),
      onSubmitted: () => this.submitCustomColorHex()
    });
    
    // Opacity input
    const opacityField = this.createTextField({
      labelText: AppFlowyEditorL10n.current.opacity,
      controller: this.opacityController,
      onChanged: () => this.updateColorSample(colorSample),
      onSubmitted: () => this.submitCustomColorHex()
    });
    
    details.appendChild(hexField);
    details.appendChild(document.createElement('br'));
    details.appendChild(opacityField);
    
    container.appendChild(details);
    
    // Store reference for expansion toggle
    (container as any)._details = details;
    
    return container;
  }

  private updateExpansion(container: HTMLElement): void {
    const details = (container as any)._details;
    if (details) {
      details.style.display = this.isExpanded ? 'block' : 'none';
    }
  }

  private updateColorSample(colorSample: HTMLElement): void {
    const color = this.combineColorHexAndOpacity(
      this.colorController.value,
      this.opacityController.value
    );
    const colorValue = parseInt(color) || 0xFFFFFFFF;
    colorSample.style.backgroundColor = `#${colorValue.toString(16).substring(2)}`;
  }

  private createTextField(options: {
    labelText: string;
    controller: HTMLInputElement;
    onChanged?: () => void;
    onSubmitted?: () => void;
  }): HTMLElement {
    const { labelText, controller, onChanged, onSubmitted } = options;
    
    const container = document.createElement('div');
    container.style.marginBottom = '10px';
    
    const label = document.createElement('label');
    label.textContent = labelText;
    label.style.cssText = `
      display: block;
      margin-bottom: 4px;
      font-size: 12px;
      color: #666;
    `;
    
    controller.style.cssText = `
      width: 100%;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
    `;
    
    if (onChanged) {
      controller.addEventListener('input', onChanged);
    }
    
    if (onSubmitted) {
      controller.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          onSubmitted();
        }
      });
    }
    
    container.appendChild(label);
    container.appendChild(controller);
    
    return container;
  }

  private combineColorHexAndOpacity(colorHex: string, opacity: string): string {
    colorHex = this.fixColorHex(colorHex);
    opacity = this.fixOpacity(opacity);
    const opacityHex = Math.round(parseInt(opacity) * 2.55).toString(16).padStart(2, '0');
    return `0x${opacityHex}${colorHex}`;
  }

  private fixColorHex(colorHex: string): string {
    if (colorHex.length > 6) {
      colorHex = colorHex.substring(0, 6);
    }
    if (parseInt(colorHex, 16).toString() === 'NaN') {
      colorHex = 'FFFFFF';
    }
    return colorHex;
  }

  private fixOpacity(opacity: string): string {
    const regex = /^(0|[1-9][0-9]?)$/;
    if (regex.test(opacity)) {
      return opacity;
    } else {
      return '100';
    }
  }

  private submitCustomColorHex(): void {
    const color = this.combineColorHexAndOpacity(
      this.colorController.value,
      this.opacityController.value
    );
    this.onSubmittedColorHex(color);
  }
}