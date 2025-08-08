import { type BlockTool, type ToolboxConfig, type BlockToolConstructorOptions, type PasteConfig } from "@editorjs/editorjs";

type BookmarkData = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
};

export type BookmarkConfig = {
  /** Optional function to fetch metadata for a URL (title, description, image) */
  fetchMetadata?: (url: string) => Promise<Partial<BookmarkData>>;
};

export default class BookmarkBlock implements BlockTool {
  public api;
  public readOnly;
  private _config: BookmarkConfig | undefined;
  private _data: BookmarkData;
  private _holderNode: HTMLDivElement;

  private _CSS = {
    wrapper: "cdx-bookmark",
    input: "cdx-bookmark__input",
    card: "cdx-bookmark__card",
    title: "cdx-bookmark__title",
    desc: "cdx-bookmark__desc",
    url: "cdx-bookmark__url",
    image: "cdx-bookmark__image",
    actions: "cdx-bookmark__actions",
    button: "cdx-bookmark__btn",
  };

  constructor({ api, data, readOnly, config }: BlockToolConstructorOptions<Partial<BookmarkData>, BookmarkConfig>) {
    this.api = api;
    this.readOnly = readOnly;
    this._config = config;
    this._data = this._normalizeData(data);
    this._holderNode = this._draw();
  }

  private _normalizeData(data?: Partial<BookmarkData>): BookmarkData {
    return {
      url: data?.url || "",
      title: data?.title || "",
      description: data?.description || "",
      image: data?.image || "",
    };
  }

  private _draw(): HTMLDivElement {
    const wrapper = document.createElement("div");
    wrapper.classList.add(this._CSS.wrapper);

    if (!this._data.url) {
      const input = document.createElement("input");
      input.type = "url";
      input.placeholder = "Paste a link…";
      input.classList.add(this._CSS.input);
      input.value = this._data.url || "";
      if (!this.readOnly) {
        input.addEventListener("change", async () => {
          const url = input.value.trim();
          if (url) {
            await this._setUrl(url);
          }
        });
      } else {
        input.readOnly = true;
      }
      wrapper.appendChild(input);
    } else {
      wrapper.appendChild(this._renderCard());
    }

    return wrapper;
  }

  private _renderCard(): HTMLElement {
    const card = document.createElement("div");
    card.classList.add(this._CSS.card);

    if (this._data.image) {
      const img = document.createElement("img");
      img.src = this._data.image;
      img.alt = this._data.title || this._data.url;
      img.classList.add(this._CSS.image);
      card.appendChild(img);
    }

    const title = document.createElement("div");
    title.classList.add(this._CSS.title);
    const link = document.createElement("a");
    link.href = this._data.url;
    link.textContent = this._data.title || this._data.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    title.appendChild(link);
    card.appendChild(title);

    if (this._data.description) {
      const desc = document.createElement("div");
      desc.classList.add(this._CSS.desc);
      desc.textContent = this._data.description;
      card.appendChild(desc);
    }

    const urlDiv = document.createElement("div");
    urlDiv.classList.add(this._CSS.url);
    urlDiv.textContent = this._data.url;
    card.appendChild(urlDiv);

    if (!this.readOnly) {
      const actions = document.createElement("div");
      actions.classList.add(this._CSS.actions);
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Change link";
      edit.classList.add(this._CSS.button);
      edit.addEventListener("click", () => this._switchToInput());
      actions.appendChild(edit);
      card.appendChild(actions);
    }

    return card;
  }

  private _switchToInput() {
    this._holderNode.innerHTML = "";
    const input = document.createElement("input");
    input.type = "url";
    input.placeholder = "Paste a link…";
    input.classList.add(this._CSS.input);
    input.value = this._data.url || "";
    input.addEventListener("change", async () => {
      const url = input.value.trim();
      if (url) await this._setUrl(url);
    });
    this._holderNode.appendChild(input);
    input.focus();
  }

  private async _setUrl(url: string): Promise<void> {
    this._data.url = url;
    try {
      if (this._config?.fetchMetadata) {
        const meta = await this._config.fetchMetadata(url);
        this._data.title = meta.title || this._data.title;
        this._data.description = meta.description || this._data.description;
        this._data.image = meta.image || this._data.image;
      }
    } catch (e) {
      // ignore metadata errors
    }
    this._holderNode.innerHTML = "";
    this._holderNode.appendChild(this._renderCard());
  }

  render(): HTMLElement {
    return this._holderNode;
  }

  save(): BookmarkData {
    return { ...this._data };
  }

  static get toolbox(): ToolboxConfig {
    return {
      title: "Bookmark",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
    };
  }

  static get pasteConfig(): PasteConfig {
    return {
      patterns: {
        url: /^(https?:\/\/\S+)$/i,
      },
    };
  }

  onPaste(event: any): void {
    if (event.type === "pattern") {
      const url = (event.detail?.data as string) || "";
      if (url) this._setUrl(url);
    }
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }
}


