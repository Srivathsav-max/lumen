import { EditorState } from '../../../../editor_state';
import { CommandShortcutEvent, CommandShortcutEventHandler, KeyEventResult } from '../command_shortcut_event';
import { AppFlowyEditorL10n } from '../../../../l10n/appflowy_editor_l10n';
import { AppFlowyClipboard } from '../../../../../infra/clipboard';
import { htmlToDocument } from '../../../../plugins/html/html_document';
import { AppFlowyRichTextKeys } from '../../../../block_component/rich_text/rich_text_keys';
import { Delta } from '../../../../delta';
import { paragraphNode } from '../../../../node/paragraph_node';
import { Selection, Position } from '../../../../selection';

export const pasteCommands = [
  pasteCommand,
  pasteTextWithoutFormattingCommand,
];

/**
 * Paste command
 * 
 * - support
 *   - desktop
 *   - web
 */
export const pasteCommand = new CommandShortcutEvent({
  key: 'paste the content',
  getDescription: () => AppFlowyEditorL10n.current.cmdPasteContent,
  command: 'ctrl+v',
  macOSCommand: 'cmd+v',
  handler: pasteCommandHandler,
});

export const pasteTextWithoutFormattingCommand = new CommandShortcutEvent({
  key: 'paste the content as plain text',
  getDescription: () => AppFlowyEditorL10n.current.cmdPasteContentAsPlainText,
  command: 'ctrl+shift+v',
  macOSCommand: 'cmd+shift+v',
  handler: pasteTextWithoutFormattingCommandHandler,
});

const pasteTextWithoutFormattingCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }

  (async () => {
    const data = await AppFlowyClipboard.getData();
    const text = data.text;
    if (text && text.length > 0) {
      await editorState.pastePlainText(text);
    }
  })();

  return KeyEventResult.handled;
};

const pasteCommandHandler: CommandShortcutEventHandler = (editorState: EditorState) => {
  const selection = editorState.selection;
  if (!selection) {
    return KeyEventResult.ignored;
  }

  (async () => {
    const data = await AppFlowyClipboard.getData();
    const text = data.text;
    const html = data.html;
    
    if (html && html.length > 0) {
      // If the html is pasted successfully, then return
      // Otherwise, paste the plain text
      if (await editorState.pasteHtml(html)) {
        return;
      }
    }

    if (text && text.length > 0) {
      editorState.pastePlainText(text);
    }
  })();

  return KeyEventResult.handled;
};

const hrefRegex = /https?:\/\/(?:www\.)?[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/;
const phoneRegex = /^\+?(?:[0-9][\s-.]?)+[0-9]$/;

// Extension methods for EditorState
declare module '../../../../editor_state' {
  interface EditorState {
    pasteHtml(html: string): Promise<boolean>;
    pastePlainText(plainText: string): Promise<void>;
    maybeConvertToUrlOrPhone(plainText: string): Promise<boolean>;
  }
}

// Add methods to EditorState prototype if it exists
if (typeof EditorState !== 'undefined') {
  EditorState.prototype.pasteHtml = async function(html: string): Promise<boolean> {
    const nodes = htmlToDocument(html).root.children.slice();
    
    // Remove empty nodes from front and back
    while (nodes.length > 0 && 
           nodes[0].delta?.isEmpty === true && 
           nodes[0].children.length === 0) {
      nodes.shift();
    }
    while (nodes.length > 0 && 
           nodes[nodes.length - 1].delta?.isEmpty === true && 
           nodes[nodes.length - 1].children.length === 0) {
      nodes.pop();
    }
    
    if (nodes.length === 0) {
      return false;
    }
    
    if (nodes.length === 1) {
      await this.pasteSingleLineNode(nodes[0]);
    } else {
      await this.pasteMultiLineNodes(nodes);
    }
    
    return true;
  };

  EditorState.prototype.pastePlainText = async function(plainText: string): Promise<void> {
    const selectionAttributes = this.getDeltaAttributesInSelectionStart();
    const selection = await this.deleteSelectionIfNeeded();

    if (!selection) {
      return;
    }

    if (await this.maybeConvertToUrlOrPhone(plainText)) {
      return;
    }

    const paragraphs = plainText
      .split('\n')
      .map(paragraph => paragraph.replace(/\r/g, '').trimEnd());

    const nodes = paragraphs.map(paragraph => {
      const delta = new Delta();
      
      if (hrefRegex.test(paragraph) || phoneRegex.test(paragraph)) {
        const match = hrefRegex.exec(paragraph) || phoneRegex.exec(paragraph);
        if (match) {
          const startPos = match.index!;
          const endPos = startPos + match[0].length;
          const entity = match[0];

          // Insert text before the link or phone
          if (startPos > 0) {
            delta.insert(paragraph.substring(0, startPos));
          }

          // Insert the link or phone
          delta.insert(paragraph.substring(startPos, endPos), {
            [AppFlowyRichTextKeys.href]: phoneRegex.test(entity) ? `tel:${entity}` : entity,
          });

          // Insert text after the link or phone
          if (endPos < paragraph.length) {
            delta.insert(paragraph.substring(endPos));
          }
        }
      } else {
        delta.insert(paragraph, selectionAttributes);
      }
      
      return paragraphNode({ delta });
    });

    if (nodes.length === 0) {
      return;
    }
    
    if (nodes.length === 1) {
      await this.pasteSingleLineNode(nodes[0]);
    } else {
      await this.pasteMultiLineNodes(nodes);
    }
  };

  EditorState.prototype.maybeConvertToUrlOrPhone = async function(plainText: string): Promise<boolean> {
    const selection = this.selection;
    if (!selection || 
        !selection.isSingle || 
        selection.isCollapsed ||
        (!hrefRegex.test(plainText) && !phoneRegex.test(plainText))) {
      return false;
    }

    const node = this.getNodeAtPath(selection.start.path);
    if (!node) {
      return false;
    }

    const transaction = this.transaction;
    const isPhone = phoneRegex.test(plainText);
    transaction.formatText(node, selection.startIndex, selection.length, {
      [AppFlowyRichTextKeys.href]: isPhone ? `tel:${plainText}` : plainText,
    });
    await this.apply(transaction);
    return true;
  };
}