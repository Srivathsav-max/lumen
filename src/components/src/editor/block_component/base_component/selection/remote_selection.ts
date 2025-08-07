import { Selection } from '../../../../core/editor_state';
import { ComponentChild } from '../../../../core/component';
import { Rect } from './block_selection_area';

export class RemoteSelection {
  readonly id: string;
  readonly selection: Selection;
  readonly selectionColor: string;
  readonly cursorColor: string;
  readonly builder?: (
    context: any,
    selection: RemoteSelection,
    rect: Rect,
  ) => ComponentChild;

  constructor(options: {
    id: string;
    selection: Selection;
    selectionColor: string;
    cursorColor: string;
    builder?: (
      context: any,
      selection: RemoteSelection,
      rect: Rect,
    ) => ComponentChild;
  }) {
    this.id = options.id;
    this.selection = options.selection;
    this.selectionColor = options.selectionColor;
    this.cursorColor = options.cursorColor;
    this.builder = options.builder;
  }
}