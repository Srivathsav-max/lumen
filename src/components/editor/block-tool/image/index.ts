import { TunesMenuConfig } from "@editorjs/editorjs/types/tools";
import "./index.css";
import {
  type BlockTool,
  type ToolboxConfig,
  type BlockToolConstructorOptions,
  type PasteConfig,
} from "@editorjs/editorjs";

type ImageData = {
  file?: {
    url?: string;
  };
  url?: string;
  caption?: string;
  withBorder?: boolean;
  withBackground?: boolean;
  stretched?: boolean;
};

export type ImageConfig = {
  endpoints?: {
    byFile?: string;
    byUrl?: string;
  };
  field?: string;
  types?: string;
  captionPlaceholder?: string;
  buttonContent?: string;
  uploader?: {
    uploadByFile?: (file: File) => Promise<{ success: number; file: { url: string } }>;
    uploadByUrl?: (url: string) => Promise<{ success: number; file: { url: string } }>;
  };
};

export default class ImageBlock implements BlockTool {
  /**
   * Editor.js API
   */
  public api;
  /**
   * Read only mode flag
   */
  public readOnly;
  /**
   * Image configuration
   */
  private _config;
  /**
   * Image data
   */
  private _data;
  /**
   * Image element
   */
  private _holderNode;
  /**
   * Image css
   */
  private _CSS;

  constructor({
    api,
    data,
    readOnly,
    config,
  }: BlockToolConstructorOptions<ImageData, ImageConfig>) {
    this.api = api;
    this.readOnly = readOnly;

    this._CSS = {
      block: this.api.styles.block,
      wrapper: "cdx-image",
      imageContainer: "cdx-image__container",
      imagePreloader: "cdx-image__preloader",
      imageEl: "cdx-image__picture",
      caption: "cdx-image__caption",
      selectButton: "cdx-image__select-button",
      loader: "cdx-image__loader",
      withBorder: "cdx-image--with-border",
      withBackground: "cdx-image--with-background",
      stretched: "cdx-image--stretched",
    };

    this._config = {
      endpoints: config?.endpoints || {},
      field: config?.field || "image",
      types: config?.types || "image/*",
      captionPlaceholder: config?.captionPlaceholder || "Caption",
      buttonContent: config?.buttonContent || "Select an Image",
      uploader: config?.uploader,
    };

    this._data = this._normalizeData(data);
    this._holderNode = this._drawView();
  }

  /**
   * Normalize input data
   */
  private _normalizeData(data: Partial<ImageData>): ImageData {
    return {
      file: data.file || undefined,
      url: data.url || "",
      caption: data.caption || "",
      withBorder: data.withBorder !== undefined ? data.withBorder : false,
      withBackground: data.withBackground !== undefined ? data.withBackground : false,
      stretched: data.stretched !== undefined ? data.stretched : false,
    };
  }

  /**
   * Create Tool's view
   */
  private _drawView(): HTMLDivElement {
    const wrapper = document.createElement("DIV") as HTMLDivElement;
    wrapper.classList.add(this._CSS.wrapper);

    if (this._data.file?.url || this._data.url) {
      this._createImage(wrapper);
    } else {
      this._createSelectButton(wrapper);
    }

    return wrapper;
  }

  /**
   * Create image element
   */
  private _createImage(wrapper: HTMLDivElement): void {
    const container = document.createElement("DIV");
    const image = document.createElement("IMG") as HTMLImageElement;
    const caption = document.createElement("DIV");

    container.classList.add(this._CSS.imageContainer);
    image.classList.add(this._CSS.imageEl);
    caption.classList.add(this._CSS.caption);

    const url = this._data.file?.url || this._data.url;
    if (url) {
      image.src = url;
    }

    image.alt = this._data.caption || "";

    caption.contentEditable = !this.readOnly ? "true" : "false";
    caption.dataset.placeholder = this._config.captionPlaceholder;
    caption.innerHTML = this._data.caption || "";

    // Apply tunes
    if (this._data.withBorder) {
      container.classList.add(this._CSS.withBorder);
    }
    if (this._data.withBackground) {
      container.classList.add(this._CSS.withBackground);
    }
    if (this._data.stretched) {
      container.classList.add(this._CSS.stretched);
    }

    container.appendChild(image);
    wrapper.appendChild(container);
    wrapper.appendChild(caption);
  }

  /**
   * Create select button
   */
  private _createSelectButton(wrapper: HTMLDivElement): void {
    const button = document.createElement("DIV");
    const input = document.createElement("INPUT") as HTMLInputElement;

    button.classList.add(this._CSS.selectButton);
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="9" cy="9" r="2"/>
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
      </svg>
      <span>${this._config.buttonContent}</span>
    `;

    input.type = "file";
    input.accept = this._config.types;
    input.style.display = "none";

    if (!this.readOnly) {
      button.addEventListener("click", () => {
        input.click();
      });

      input.addEventListener("change", (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          this._uploadFile(file);
        }
      });
    }

    button.appendChild(input);
    wrapper.appendChild(button);
  }

  /**
   * Upload file
   */
  private async _uploadFile(file: File): Promise<void> {
    if (this._config.uploader?.uploadByFile) {
      try {
        const result = await this._config.uploader.uploadByFile(file);
        if (result.success) {
          this._data.file = result.file;
          this._updateView();
        }
      } catch (error) {
        console.error("File upload failed:", error);
      }
    } else {
      // Fallback to local file URL
      const reader = new FileReader();
      reader.onload = (e) => {
        this._data.url = e.target?.result as string;
        this._updateView();
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Update view after data change
   */
  private _updateView(): void {
    this._holderNode.innerHTML = "";
    if (this._data.file?.url || this._data.url) {
      this._createImage(this._holderNode);
    } else {
      this._createSelectButton(this._holderNode);
    }
  }

  /**
   * Extract Tool's data from the view
   */
  save(): ImageData {
    const caption = this._holderNode.querySelector(`.${this._CSS.caption}`) as HTMLElement;
    
    return {
      file: this._data.file,
      url: this._data.url,
      caption: caption?.innerHTML || "",
      withBorder: this._data.withBorder,
      withBackground: this._data.withBackground,
      stretched: this._data.stretched,
    };
  }

  /**
   * Settings menu
   */
  renderSettings(): TunesMenuConfig {
    return [
      {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
        label: this.api.i18n.t("Add border"),
        onActivate: () => this._toggleTune("withBorder"),
        closeOnActivate: true,
        isActive: this._data.withBorder,
      },
      {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>`,
        label: this.api.i18n.t("Add background"),
        onActivate: () => this._toggleTune("withBackground"),
        closeOnActivate: true,
        isActive: this._data.withBackground,
      },
      {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15,3 21,3 21,9"/><polyline points="9,21 3,21 3,15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/></svg>`,
        label: this.api.i18n.t("Stretch image"),
        onActivate: () => this._toggleTune("stretched"),
        closeOnActivate: true,
        isActive: this._data.stretched,
      },
    ];
  }

  /**
   * Toggle image tune
   */
  private _toggleTune(tune: keyof Pick<ImageData, "withBorder" | "withBackground" | "stretched">): void {
    this._data[tune] = !this._data[tune];
    this._updateView();
  }

  render(): HTMLDivElement {
    return this._holderNode;
  }

  /**
   * Returns true to notify the core that read-only mode is supported
   */
  static get isReadOnlySupported(): boolean {
    return true;
  }

  /**
   * Tool's Toolbox settings
   */
  static get toolbox(): ToolboxConfig {
    return {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lc"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
      title: "Image",
    };
  }

  /**
   * Paste config
   */
  static get pasteConfig(): PasteConfig {
    return {
      files: {
        mimeTypes: ["image/*"],
        extensions: ["jpg", "jpeg", "png", "gif", "webp"],
      },
      patterns: {
        image: /https?:\/\/\S+\.(gif|jpe?g|tiff?|png|svg|webp)(\?\S*)?$/i,
      },
    };
  }

  /**
   * Handle paste
   */
  onPaste(event: any): void {
    switch (event.type) {
      case "file":
        this._uploadFile(event.detail.file);
        break;
      case "pattern":
        this._data.url = event.detail.data;
        this._updateView();
        break;
    }
  }
}
