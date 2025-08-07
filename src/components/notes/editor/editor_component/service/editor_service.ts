import { AppFlowySelectionService } from './selection_service';
import { AppFlowyKeyboardService } from './keyboard_service';
import { BlockComponentRendererService } from './renderer/block_component_service';
import { AppFlowyScrollService } from './scroll_service';

export class EditorService {
  // selection service
  private _selectionService: AppFlowySelectionService | null = null;
  private _keyboardService: AppFlowyKeyboardService | null = null;
  private _scrollService: AppFlowyScrollService | null = null;
  
  public rendererService!: BlockComponentRendererService;

  get selectionService(): AppFlowySelectionService {
    if (!this._selectionService) {
      throw new Error('Selection service not initialized');
    }
    return this._selectionService;
  }

  set selectionService(service: AppFlowySelectionService) {
    this._selectionService = service;
  }

  get keyboardService(): AppFlowyKeyboardService | null {
    return this._keyboardService;
  }

  set keyboardService(service: AppFlowyKeyboardService | null) {
    this._keyboardService = service;
  }

  get scrollService(): AppFlowyScrollService | null {
    return this._scrollService;
  }

  set scrollService(service: AppFlowyScrollService | null) {
    this._scrollService = service;
  }
}