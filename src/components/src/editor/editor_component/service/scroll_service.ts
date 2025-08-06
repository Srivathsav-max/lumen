export interface AutoScrollerService {
  // Auto scroller service interface - to be implemented
}

export interface ScrollController {
  offset: number;
  position: {
    maxScrollExtent: number;
    minScrollExtent: number;
  };
  animateTo(offset: number, options: { duration: number; curve?: string }): Promise<void>;
  jumpTo(offset: number): void;
}

/// [AppFlowyScrollService] is responsible for processing document scrolling.
///
/// Usually, this service can be obtained by the following code.
/// ```typescript
/// const scrollService = editorState.service.scrollService;
/// ```
export abstract class AppFlowyScrollService implements AutoScrollerService {
  /// Returns the offset of the current document on the vertical axis.
  abstract get dy(): number;

  /// Returns the height of the current document.
  abstract get onePageHeight(): number | null;

  /// Returns the number of pages in the current document.
  abstract get page(): number | null;

  /// Returns the maximum scroll height on the vertical axis.
  abstract get maxScrollExtent(): number;

  /// Returns the minimum scroll height on the vertical axis.
  abstract get minScrollExtent(): number;

  /// scroll controller
  abstract get scrollController(): ScrollController;

  /// Scrolls to the specified position.
  ///
  /// This function will filter illegal values.
  /// Only within the range of minScrollExtent and maxScrollExtent are legal values.
  abstract scrollTo(
    dy: number,
    options?: {
      duration?: number;
    }
  ): void;

  abstract jumpTo(index: number): void;

  abstract jumpToTop(): void;
  abstract jumpToBottom(): void;

  abstract goBallistic(velocity: number): void;

  /// Enables scroll service.
  abstract enable(): void;

  /// Disables scroll service.
  ///
  /// In some cases, you can disable scroll service of flowy_editor
  ///  when your custom component appears,
  ///
  /// But you need to call the `enable` function to restore after exiting
  ///   your custom component, otherwise the scroll service will fails.
  abstract disable(): void;
}