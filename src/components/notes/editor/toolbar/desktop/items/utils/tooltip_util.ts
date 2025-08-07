import { AppFlowyEditorL10n } from '../../../../../l10n/l10n';
import { PlatformExtension } from '../../../../util/platform_extension';

export function shortcutTooltips(
  macOSString?: string,
  windowsString?: string,
  linuxString?: string
): string {
  if (typeof window === 'undefined') return '';
  
  if (PlatformExtension.isMacOS && macOSString) {
    return `\n${macOSString}`;
  } else if (PlatformExtension.isWindows && windowsString) {
    return `\n${windowsString}`;
  } else if (PlatformExtension.isLinux && linuxString) {
    return `\n${linuxString}`;
  }
  
  return '';
}

export function getTooltipText(id: string): string {
  const l10n = AppFlowyEditorL10n.current;
  
  switch (id) {
    case 'underline':
      return `${l10n.underline}${shortcutTooltips('⌘ + U', 'CTRL + U', 'CTRL + U')}`;
    case 'bold':
      return `${l10n.bold}${shortcutTooltips('⌘ + B', 'CTRL + B', 'CTRL + B')}`;
    case 'italic':
      return `${l10n.italic}${shortcutTooltips('⌘ + I', 'CTRL + I', 'CTRL + I')}`;
    case 'strikethrough':
      return `${l10n.strikethrough}${shortcutTooltips('⌘ + SHIFT + S', 'CTRL + SHIFT + S', 'CTRL + SHIFT + S')}`;
    case 'code':
      return `${l10n.embedCode}${shortcutTooltips('⌘ + E', 'CTRL + E', 'CTRL + E')}`;
    case 'align_left':
      return l10n.textAlignLeft;
    case 'align_center':
      return l10n.textAlignCenter;
    case 'align_right':
      return l10n.textAlignRight;
    case 'text_direction_auto':
      return l10n.auto;
    case 'text_direction_ltr':
      return l10n.ltr;
    case 'text_direction_rtl':
      return l10n.rtl;
    default:
      return '';
  }
}