import "./editor.css";

import React, { createRef, type PropsWithChildren } from "react";
import type EditorJS from "@editorjs/editorjs";
import type {
  API,
  BlockMutationEvent,
  EditorConfig,
  OutputData,
} from "@editorjs/editorjs";

type Props = PropsWithChildren &
  Omit<EditorConfig, "onChange" | "initialBlock" | "holderId" | "onReady"> & {
    onChangeHandler?(api: API, event: BlockMutationEvent | BlockMutationEvent[]): void;
    onSaveHandler?(output?: OutputData): void;
    onReadyHandler(editor: EditorJS | null): void;
  };

export class EditorCore extends React.PureComponent<Props> {
  private editor: EditorJS | null = null;
  private holderRef = createRef<HTMLDivElement>();
  private EditorJS: typeof EditorJS | null = null;
  private tools: any = null;
  private isInitialized: boolean = false;

  async componentDidMount(): Promise<void> {
    await this.loadEditorJS();
    this.initEditor();
  }

  componentWillUnmount(): void {
    this.destroyEditor();
  }

  async loadEditorJS(): Promise<void> {
    try {
      // Dynamically import EditorJS and tools
      const [editorModule, toolsModule] = await Promise.all([
        import("@editorjs/editorjs"),
        import("../tools"),
      ]);
      
      this.EditorJS = editorModule.default;
      this.tools = toolsModule.tools;
    } catch (error) {
      console.error("Failed to load EditorJS:", error);
    }
  }

  async destroyEditor(): Promise<void> {
    try {
      if (this.editor && typeof this.editor.destroy === "function") {
        await this.editor.destroy();
        this.editor = null;
        this.isInitialized = false;
      }
    } catch (error) {
      console.log("Failed to destroy editor", error);
    }
  }

  onChange(api: API, event: BlockMutationEvent | BlockMutationEvent[]): void {
    this.props.onChangeHandler?.(api, event);
  }

  async dispatchData(cb?: (data?: OutputData) => void): Promise<void> {
    try {
      const data = await this.editor?.save();
      cb?.(data);
    } catch (error) {
      console.log("Failed dispatch save data", error);
    }
  }

  initEditor(): void {
    if (!this.EditorJS || !this.tools) {
      console.error("EditorJS or tools not loaded");
      return;
    }

    if (this.isInitialized) {
      console.log("Editor already initialized, skipping");
      return;
    }

    const { holder, ...config } = this.props;
    const holderNode = holder ?? this.getHolderNode();

    this.editor = new this.EditorJS({
      holder: holderNode,
      onChange: (api, event) => this.onChange(api, event),
      tools: this.tools,
      onReady: () => this.props.onReadyHandler(this.editor),
      minHeight: 0,
      defaultBlock: 'paragraph',
      ...config,
    });
    
    this.isInitialized = true;
  }

  getHolderNode(): HTMLDivElement | string {
    return this.holderRef.current ?? "editor";
  }

  render(): React.ReactNode {
    const { children, holder, onChangeHandler, onSaveHandler, onReadyHandler, ...config } = this.props;

    return (
      <div>
        {children}
        <div ref={this.holderRef} id="editor" />
      </div>
    );
  }
}
