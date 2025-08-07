import { MobileToolbarItem } from '../mobile_toolbar_item';
import { AppFlowyRichTextKeys } from '../../../block_component/rich_text/appflowy_rich_text_keys';

export const codeMobileToolbarItem = MobileToolbarItem.action({
  itemIconBuilder: (context, editorState, service) => {
    const icon = document.createElement('div');
    icon.style.cssText = `
      width: 24px;
      height: 24px;
      background-color: currentColor;
      border-radius: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: monospace;
      font-size: 12px;
      color: white;
    `;
    icon.textContent = '</>';
    return icon;
  },
  actionHandler: (editorState) => {
    editorState.toggleAttribute(AppFlowyRichTextKeys.code);
  }
});