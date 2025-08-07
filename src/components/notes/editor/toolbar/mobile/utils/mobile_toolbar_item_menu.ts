import { EditorState } from '../../../../editor_state';
import { MobileToolbarTheme } from '../mobile_toolbar_style';

export class MobileToolbarItemMenu {
  private editorState: EditorState;
  private itemMenuBuilder: () => HTMLElement;

  constructor(options: {
    editorState: EditorState;
    itemMenuBuilder: () => HTMLElement;
  }) {
    this.editorState = options.editorState;
    this.itemMenuBuilder = options.itemMenuBuilder;
  }

  render(context: HTMLElement): HTMLElement {
    const size = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    const style = MobileToolbarTheme.of(context);

    const container = document.createElement('div');
    container.style.cssText = `
      width: ${size.width}px;
      background-color: ${style.backgroundColor};
      padding: 8px;
    `;

    container.appendChild(this.itemMenuBuilder());
    return container;
  }
}