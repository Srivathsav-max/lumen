import { type BlockTool, type ToolboxConfig, type BlockToolConstructorOptions, type PasteConfig } from "@editorjs/editorjs";

type FileData = {
  file?: { url?: string; name?: string; size?: number };
  url?: string;
  title?: string;
};

export type FileConfig = {
  endpoints?: { byFile?: string; byUrl?: string };
  field?: string;
  types?: string;
  uploader?: {
    uploadByFile?: (file: File) => Promise<{ success: number; file: { url: string; name?: string; size?: number } }>;
    uploadByUrl?: (url: string) => Promise<{ success: number; file: { url: string; name?: string; size?: number } }>;
  };
};

export default class FileBlock implements BlockTool {
  public api;
  public readOnly;
  private _config: FileConfig;
  private _data: FileData;
  private _holderNode: HTMLDivElement;
  private _CSS = {
    wrapper: "cdx-file",
    meta: "cdx-file__meta",
    name: "cdx-file__name",
    size: "cdx-file__size",
    actions: "cdx-file__actions",
    btn: "cdx-file__btn",
  };

  constructor({ api, data, readOnly, config }: BlockToolConstructorOptions<Partial<FileData>, FileConfig>) {
    this.api = api;
    this.readOnly = readOnly;
    this._config = {
      endpoints: config?.endpoints || {},
      field: config?.field || "file",
      types: config?.types || "*",
      uploader: config?.uploader,
    };
    this._data = this._normalizeData(data);
    this._holderNode = this._draw();
  }

  private _normalizeData(data?: Partial<FileData>): FileData {
    return {
      file: data?.file,
      url: data?.url || "",
      title: data?.title || "",
    };
  }

  private _draw(): HTMLDivElement {
    const wrapper = document.createElement("div");
    wrapper.classList.add(this._CSS.wrapper);

    if (!this._data.file?.url && !this._data.url) {
      const pick = document.createElement("button");
      pick.type = "button";
      pick.textContent = "Upload file";
      pick.classList.add(this._CSS.btn);
      const input = document.createElement("input");
      input.type = "file";
      input.accept = this._config.types;
      input.style.display = "none";
      if (!this.readOnly) {
        pick.addEventListener("click", () => input.click());
        input.addEventListener("change", (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) this._uploadFile(file);
        });
      } else {
        pick.disabled = true;
      }
      wrapper.appendChild(pick);
      wrapper.appendChild(input);
    } else {
      wrapper.appendChild(this._renderMeta());
    }

    return wrapper;
  }

  private _renderMeta(): HTMLElement {
    const meta = document.createElement("div");
    meta.classList.add(this._CSS.meta);
    const name = document.createElement("a");
    name.classList.add(this._CSS.name);
    const url = this._data.file?.url || this._data.url || "#";
    name.href = url;
    name.target = "_blank";
    name.rel = "noopener noreferrer";
    name.textContent = this._data.title || this._data.file?.name || url;
    meta.appendChild(name);

    const size = document.createElement("span");
    size.classList.add(this._CSS.size);
    const bytes = this._data.file?.size ?? 0;
    if (bytes) size.textContent = this._formatSize(bytes);
    meta.appendChild(size);

    return meta;
  }

  private _formatSize(bytes: number): string {
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  }

  private async _uploadFile(file: File) {
    if (this._config.uploader?.uploadByFile) {
      try {
        const res = await this._config.uploader.uploadByFile(file);
        if (res.success) {
          this._data.file = res.file;
          this._update();
        }
      } catch (e) {
        console.error("File upload failed", e);
      }
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      this._data.url = String(e.target?.result || "");
      this._data.file = { url: this._data.url, name: file.name, size: file.size };
      this._update();
    };
    reader.readAsDataURL(file);
  }

  private _update() {
    this._holderNode.innerHTML = "";
    this._holderNode.appendChild(this._renderMeta());
  }

  render(): HTMLElement {
    return this._holderNode;
  }

  save(): FileData {
    return { ...this._data };
  }

  static get toolbox(): ToolboxConfig {
    return {
      title: "File",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`,
    };
  }

  static get pasteConfig(): PasteConfig {
    return {
      patterns: {
        file: /^(https?:\/\/\S+\.(pdf|zip|docx?|pptx?|xlsx?|txt))(\?\S*)?$/i,
      },
    };
  }

  onPaste(event: any): void {
    if (event.type === "pattern") {
      const url = (event.detail?.data as string) || "";
      if (url) {
        this._data.url = url;
        this._update();
      }
    }
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }
}


