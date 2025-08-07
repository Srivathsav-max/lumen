// Color picker component for selecting colors in the editor
export interface ColorOption {
  colorHex: string;
  name: string;
}

export interface ColorOptionList {
  selectedColorHex?: string;
  header: string;
  colorOptions: ColorOption[];
  onSubmittedAction: (color: string) => void;
  hexController: TextController;
  opacityController: TextController;
}

export interface TextController {
  text: string;
  setText(text: string): void;
}

export interface ColorPickerProps {
  pickerBackgroundColor: string;
  pickerItemHoverColor: string;
  pickerItemTextColor: string;
  colorOptionLists: ColorOptionList[];
}

class TextControllerImpl implements TextController {
  private _text: string = '';

  constructor(initialText: string = '') {
    this._text = initialText;
  }

  get text(): string {
    return this._text;
  }

  setText(text: string): void {
    this._text = text;
  }
}

export function createColorOptionList(options: {
  selectedColorHex?: string;
  header: string;
  colorOptions: ColorOption[];
  onSubmittedAction: (color: string) => void;
}): ColorOptionList {
  const hexController = new TextControllerImpl(
    extractColorHex(options.selectedColorHex) || 'FFFFFF'
  );
  const opacityController = new TextControllerImpl(
    convertHexToOpacity(options.selectedColorHex) || '100'
  );

  return {
    selectedColorHex: options.selectedColorHex,
    header: options.header,
    colorOptions: options.colorOptions,
    onSubmittedAction: options.onSubmittedAction,
    hexController,
    opacityController
  };
}

function convertHexToOpacity(colorHex?: string): string | null {
  if (!colorHex) return null;
  const opacityHex = colorHex.substring(2, 4);
  const opacity = parseInt(opacityHex, 16) / 2.55;
  return opacity.toFixed(0);
}

function extractColorHex(colorHex?: string): string | null {
  if (!colorHex) return null;
  return colorHex.substring(4);
}

export class ColorPicker {
  private props: ColorPickerProps;
  private element: HTMLElement;

  constructor(props: ColorPickerProps) {
    this.props = props;
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      background-color: ${this.props.pickerBackgroundColor};
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
      border-radius: 6px;
      height: 250px;
      width: 220px;
      padding: 10px 6px;
      overflow-y: auto;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
    `;

    this.buildColorOptionLists(this.props.colorOptionLists).forEach(element => {
      content.appendChild(element);
    });

    container.appendChild(content);
    return container;
  }

  private buildColorOptionLists(colorOptionLists: ColorOptionList[]): HTMLElement[] {
    const elements: HTMLElement[] = [];
    
    for (let i = 0; i < colorOptionLists.length; i++) {
      if (i !== 0) {
        const spacer = document.createElement('div');
        spacer.style.height = '6px';
        elements.push(spacer);
      }

      elements.push(this.buildHeader(colorOptionLists[i].header));
      
      const spacer = document.createElement('div');
      spacer.style.height = '6px';
      elements.push(spacer);
      
      elements.push(this.buildColorItems(colorOptionLists[i]));
    }

    return elements;
  }

  private buildHeader(text: string): HTMLElement {
    const header = document.createElement('div');
    header.textContent = text;
    header.style.cssText = `
      color: #666;
      font-weight: bold;
      font-size: 12px;
    `;
    return header;
  }

  private buildColorItems(colorOptionList: ColorOptionList): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
    `;

    // Add custom color item
    container.appendChild(this.buildCustomColorItem(colorOptionList));

    // Add color options
    colorOptionList.colorOptions.forEach(colorOption => {
      const isChecked = colorOption.colorHex === colorOptionList.selectedColorHex;
      container.appendChild(
        this.buildColorItem(
          colorOptionList.onSubmittedAction,
          colorOption,
          isChecked
        )
      );
    });

    return container;
  }

  private buildColorItem(
    onTap: (color: string) => void,
    option: ColorOption,
    isChecked: boolean
  ): HTMLElement {
    const item = document.createElement('div');
    item.style.cssText = `
      height: 36px;
      width: 100%;
      display: flex;
      align-items: center;
      padding: 0 6px;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.2s;
    `;

    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = this.props.pickerItemHoverColor;
    });

    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
    });

    item.addEventListener('click', () => onTap(option.colorHex));

    // Color circle
    const colorCircle = document.createElement('div');
    colorCircle.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: ${option.colorHex};
      margin-right: 10px;
    `;

    // Text
    const text = document.createElement('span');
    text.textContent = option.name;
    text.style.cssText = `
      font-size: 12px;
      color: ${this.props.pickerItemTextColor};
      flex: 1;
    `;

    // Checkmark
    if (isChecked) {
      const checkmark = document.createElement('span');
      checkmark.textContent = '✓';
      checkmark.style.cssText = `
        color: ${this.props.pickerItemTextColor};
        font-weight: bold;
      `;
      item.appendChild(checkmark);
    }

    item.appendChild(colorCircle);
    item.appendChild(text);

    return item;
  }

  private buildCustomColorItem(colorOptionList: ColorOptionList): HTMLElement {
    const container = document.createElement('details');
    container.style.cssText = `
      width: 100%;
      margin-bottom: 6px;
    `;

    const summary = document.createElement('summary');
    summary.style.cssText = `
      height: 36px;
      display: flex;
      align-items: center;
      padding: 0 6px;
      cursor: pointer;
      list-style: none;
    `;

    // Color circle for custom color
    const colorCircle = document.createElement('div');
    const customColor = combineColorHexAndOpacity(
      colorOptionList.hexController.text,
      colorOptionList.opacityController.text
    );
    colorCircle.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: #${customColor.substring(4)};
      margin-right: 10px;
    `;

    const text = document.createElement('span');
    text.textContent = 'Custom Color';
    text.style.cssText = `
      font-size: 12px;
      color: ${this.props.pickerItemTextColor};
      flex: 1;
    `;

    summary.appendChild(colorCircle);
    summary.appendChild(text);

    // Custom color inputs
    const inputs = document.createElement('div');
    inputs.style.cssText = `
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;

    inputs.appendChild(
      this.customColorDetailsTextField(
        'Hex Color',
        colorOptionList.hexController,
        colorOptionList
      )
    );

    inputs.appendChild(
      this.customColorDetailsTextField(
        'Opacity',
        colorOptionList.opacityController,
        colorOptionList
      )
    );

    container.appendChild(summary);
    container.appendChild(inputs);

    return container;
  }

  private customColorDetailsTextField(
    labelText: string,
    controller: TextController,
    colorOptionList: ColorOptionList
  ): HTMLElement {
    const container = document.createElement('div');
    
    const label = document.createElement('label');
    label.textContent = labelText;
    label.style.cssText = `
      font-size: 12px;
      color: ${this.props.pickerItemTextColor};
      display: block;
      margin-bottom: 2px;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = controller.text;
    input.style.cssText = `
      width: 100%;
      padding: 4px 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 12px;
    `;

    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      controller.setText(target.value);
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        colorOptionList.onSubmittedAction(
          combineColorHexAndOpacity(
            colorOptionList.hexController.text,
            colorOptionList.opacityController.text
          )
        );
      }
    });

    container.appendChild(label);
    container.appendChild(input);

    return container;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.element.remove();
  }
}

function combineColorHexAndOpacity(colorHex: string, opacity: string): string {
  colorHex = fixColorHex(colorHex);
  opacity = fixOpacity(opacity);
  const opacityHex = Math.round(parseInt(opacity) * 2.55).toString(16).padStart(2, '0');
  return `0x${opacityHex}${colorHex}`;
}

function fixColorHex(colorHex: string): string {
  if (colorHex.length > 6) {
    colorHex = colorHex.substring(0, 6);
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(colorHex)) {
    colorHex = 'FFFFFF';
  }
  return colorHex.toUpperCase();
}

function fixOpacity(opacity: string): string {
  const regex = /[a-zA-Z]/;
  const numOpacity = parseInt(opacity);
  
  if (regex.test(opacity) || numOpacity > 100 || numOpacity < 0 || isNaN(numOpacity)) {
    return '100';
  }
  return opacity;
}

// Color utility extension
export function colorToHex(color: { r: number; g: number; b: number; a: number }): string {
  const alpha = Math.round(color.a * 255).toString(16).padStart(2, '0');
  const red = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const green = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const blue = Math.round(color.b * 255).toString(16).padStart(2, '0');

  return `0x${alpha}${red}${green}${blue}`.toUpperCase();
}