import { BuildContext, Offset, Rect, OverlayEntry, Widget, SizedBox, TextButton, Icon, Theme, Row, MainAxisAlignment, Expanded, Text, TextOverflow, TextStyle, Icons } from '../../../flutter/widgets';
import { Node } from '../../node';
import { EditorState } from '../../editor_state';
import { TableDirection } from './table_block_component';
import { getCellNode } from './util';
import { FullScreenOverlayEntry, positionFromRect, basicOverlay, buildOverlayButtonStyle } from '../../toolbar/desktop/items/utils/overlay_util';
import { AppFlowyEditorL10n } from '../../l10n/appflowy_editor_l10n';
import { TableActions } from './table_action';
import { TableCellBlockKeys } from './table_cell_block_keys';
import { ColorPicker, generateHighlightColorOptions } from '../../render/color_menu/color_picker';
import { Overlay } from '../../../flutter/material';

export function showActionMenu(
  context: BuildContext,
  node: Node,
  editorState: EditorState,
  position: number,
  dir: TableDirection,
): void {
  const pos = (context.findRenderObject() as RenderBox).localToGlobal(new Offset(0, 0));
  const rect = Rect.fromLTWH(
    pos.dx,
    pos.dy,
    context.size?.width ?? 0,
    context.size?.height ?? 0,
  );
  let overlay: OverlayEntry | undefined;

  const [top, bottom, left] = positionFromRect(rect, editorState);
  const adjustedTop = top !== undefined ? top - 35 : top;

  function dismissOverlay(): void {
    overlay?.remove();
    overlay = undefined;
  }

  overlay = new FullScreenOverlayEntry({
    top: adjustedTop,
    bottom: bottom,
    left: left,
    builder: (context) => {
      return basicOverlay(
        context,
        { width: 200, height: 230 },
        [
          _menuItem(
            context,
            dir === TableDirection.col
              ? AppFlowyEditorL10n.current.colAddBefore
              : AppFlowyEditorL10n.current.rowAddBefore,
            dir === TableDirection.col
              ? Icons.first_page
              : Icons.vertical_align_top,
            () => {
              TableActions.add(node, position, editorState, dir);
              dismissOverlay();
            }
          ),
          _menuItem(
            context,
            dir === TableDirection.col
              ? AppFlowyEditorL10n.current.colAddAfter
              : AppFlowyEditorL10n.current.rowAddAfter,
            dir === TableDirection.col
              ? Icons.last_page
              : Icons.vertical_align_bottom,
            () => {
              TableActions.add(node, position + 1, editorState, dir);
              dismissOverlay();
            }
          ),
          _menuItem(
            context,
            dir === TableDirection.col
              ? AppFlowyEditorL10n.current.colRemove
              : AppFlowyEditorL10n.current.rowRemove,
            Icons.delete,
            () => {
              TableActions.delete(node, position, editorState, dir);
              dismissOverlay();
            }
          ),
          _menuItem(
            context,
            dir === TableDirection.col
              ? AppFlowyEditorL10n.current.colDuplicate
              : AppFlowyEditorL10n.current.rowDuplicate,
            Icons.content_copy,
            () => {
              TableActions.duplicate(node, position, editorState, dir);
              dismissOverlay();
            }
          ),
          _menuItem(
            context,
            AppFlowyEditorL10n.current.backgroundColor,
            Icons.format_color_fill,
            () => {
              const cell = dir === TableDirection.col
                ? getCellNode(node, position, 0)
                : getCellNode(node, 0, position);
              const key = dir === TableDirection.col
                ? TableCellBlockKeys.colBackgroundColor
                : TableCellBlockKeys.rowBackgroundColor;

              _showColorMenu(
                context,
                (color) => {
                  TableActions.setBgColor(
                    node,
                    position,
                    editorState,
                    color,
                    dir,
                  );
                },
                {
                  top: adjustedTop,
                  bottom: bottom,
                  left: left,
                  selectedColorHex: cell?.attributes[key],
                }
              );
              dismissOverlay();
            }
          ),
          _menuItem(
            context,
            dir === TableDirection.col
              ? AppFlowyEditorL10n.current.colClear
              : AppFlowyEditorL10n.current.rowClear,
            Icons.clear,
            () => {
              TableActions.clear(node, position, editorState, dir);
              dismissOverlay();
            }
          ),
        ],
      );
    },
  }).build();
  
  Overlay.of(context, { rootOverlay: true }).insert(overlay!);
}

function _menuItem(
  context: BuildContext,
  text: string,
  icon: any,
  action: () => void,
): Widget {
  return new SizedBox({
    height: 36,
    child: new TextButton({
      onPressed: () => {
        action();
      },
      icon: new Icon(icon, { color: Theme.of(context).iconTheme.color }),
      style: buildOverlayButtonStyle(context),
      label: new Row({
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          new Expanded({
            child: new Text(text, {
              softWrap: false,
              maxLines: 1,
              overflow: TextOverflow.fade,
              style: new TextStyle({
                color: Theme.of(context).textTheme.labelLarge?.color,
              }),
            }),
          }),
        ],
      }),
    }),
  });
}

function _showColorMenu(
  context: BuildContext,
  action: (color?: string) => void,
  options: {
    top?: number;
    bottom?: number;
    left?: number;
    selectedColorHex?: string;
  }
): void {
  const { top, bottom, left, selectedColorHex } = options;
  let overlay: OverlayEntry | undefined;

  function dismissOverlay(): void {
    overlay?.remove();
    overlay = undefined;
  }

  overlay = new FullScreenOverlayEntry({
    top: top,
    bottom: bottom,
    left: left,
    builder: (context) => {
      return new ColorPicker({
        title: AppFlowyEditorL10n.current.highlightColor,
        selectedColorHex: selectedColorHex,
        colorOptions: generateHighlightColorOptions(),
        onSubmittedColorHex: (color, _) => {
          action(color);
          dismissOverlay();
        },
        resetText: AppFlowyEditorL10n.current.clearHighlightColor,
        resetIconName: 'clear_highlight_color',
      });
    },
  }).build();
  
  Overlay.of(context, { rootOverlay: true }).insert(overlay!);
}