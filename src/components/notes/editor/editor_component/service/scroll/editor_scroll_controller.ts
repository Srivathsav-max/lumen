// Editor scroll controller interface (matching Flutter EditorScrollController)
export interface EditorScrollController {
  dispose(): void;
  scrollTo?(offset: number): void;
  getScrollOffset?(): number;
}