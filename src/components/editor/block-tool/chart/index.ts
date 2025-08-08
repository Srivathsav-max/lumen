import {
  type BlockTool,
  type ToolboxConfig,
  type BlockToolConstructorOptions,
  type SanitizerConfig,
} from "@editorjs/editorjs";

type ChartType = "line" | "bar" | "stackedBar" | "groupedBar";

export type ChartSeries = {
  name: string;
  values: number[];
  color?: string;
};

export type ChartData = {
  title?: string;
  labels: string[];
  series: ChartSeries[];
  chartType: ChartType;
};

export type ChartConfig = {
  height?: number; // px
  palette?: string[];
};

export default class ChartBlock implements BlockTool {
  public api;
  public readOnly;
  private _config: Required<ChartConfig>;
  private _data: ChartData;
  private _holderNode: HTMLDivElement;
  private _svgEl?: SVGSVGElement;
  private _gridEl?: HTMLDivElement;

  private _CSS = {
    wrapper:
      "rounded-lg border bg-card text-card-foreground shadow-sm p-4 cdx-chart",
    header: "flex items-center justify-between gap-2 mb-3",
    title: "text-sm font-medium outline-none bg-transparent",
    actions: "flex items-center gap-2",
    btn: "inline-flex items-center rounded-md border px-2 py-1 text-xs",
    body: "relative",
    canvas: "w-full h-[240px] block",
    grid: "w-full overflow-auto mt-3",
    table: "w-full text-xs border-collapse",
    th: "border px-2 py-1 text-left bg-muted/40",
    td: "border px-2 py-1",
    input: "w-full rounded border px-1 py-0.5 text-xs",
    color: "h-6 w-6 p-0 border rounded",
  };

  constructor({ api, data, readOnly, config }: BlockToolConstructorOptions<Partial<ChartData>, ChartConfig>) {
    this.api = api;
    this.readOnly = readOnly;
    this._config = {
      height: config?.height ?? 240,
      palette: config?.palette ?? [
        "#6366f1",
        "#22c55e",
        "#f59e0b",
        "#ef4444",
        "#06b6d4",
        "#a855f7",
      ],
    };
    this._data = this._normalizeData(data);
    this._holderNode = this._draw();
  }

  static get toolbox(): ToolboxConfig[] {
    const icon = (path: string) =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    return [
      {
        title: "Line chart",
        icon: icon('<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>'),
        data: { chartType: "line" },
      },
      {
        title: "Bar chart",
        icon: icon('<path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="7"/><rect x="12" y="6" width="3" height="11"/><rect x="17" y="13" width="3" height="4"/>'),
        data: { chartType: "bar" },
      },
      {
        title: "Stacked bar",
        icon: icon('<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="5"/><rect x="7" y="9" width="3" height="3"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="15" width="3" height="2"/><rect x="17" y="12" width="3" height="3"/>'),
        data: { chartType: "stackedBar" },
      },
      {
        title: "Grouped bar",
        icon: icon('<path d="M3 3v18h18"/><rect x="6" y="10" width="2" height="7"/><rect x="9" y="8" width="2" height="9"/><rect x="13" y="7" width="2" height="10"/><rect x="16" y="12" width="2" height="5"/>'),
        data: { chartType: "groupedBar" },
      },
    ];
  }

  private _normalizeData(data?: Partial<ChartData>): ChartData {
    const chartType = (data?.chartType as ChartType) || "line";
    const labels = Array.isArray(data?.labels) && data!.labels.length
      ? data!.labels
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const series = Array.isArray(data?.series) && data!.series.length
      ? data!.series
      : [
          { name: "Series A", values: [5, 9, 7, 8, 5, 3], color: this._config.palette[0] },
          { name: "Series B", values: [3, 5, 6, 4, 6, 8], color: this._config.palette[1] },
        ];
    return {
      title: data?.title || "",
      labels,
      series,
      chartType,
    };
  }

  private _draw(): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.className = this._CSS.wrapper;

    // Header
    const hdr = document.createElement("div");
    hdr.className = this._CSS.header;

    const title = document.createElement("input");
    title.type = "text";
    title.placeholder = this.api.i18n.t("Chart title");
    title.value = this._data.title || "";
    title.className = this._CSS.title;
    title.readOnly = !!this.readOnly;
    if (!this.readOnly) title.addEventListener("input", () => (this._data.title = title.value));
    hdr.appendChild(title);

    if (!this.readOnly) {
      const actions = document.createElement("div");
      actions.className = this._CSS.actions;
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.textContent = "Edit data";
      editBtn.className = this._CSS.btn;
      editBtn.addEventListener("click", () => this._toggleEditor());
      actions.appendChild(editBtn);
      hdr.appendChild(actions);
    }

    wrap.appendChild(hdr);

    // Body
    const body = document.createElement("div");
    body.className = this._CSS.body;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", this._CSS.canvas);
    svg.setAttribute("viewBox", `0 0 800 ${this._config.height}`);
    this._svgEl = svg;
    body.appendChild(svg);
    wrap.appendChild(body);

    // Column editor (grid)
    const grid = document.createElement("div");
    grid.className = this._CSS.grid;
    grid.style.display = "none";
    this._gridEl = grid;
    this._buildGridEditor();
    wrap.appendChild(grid);

    this._renderChart(svg);
    return wrap;
  }

  private _toggleEditor(): void {
    if (!this._gridEl) return;
    const display = this._gridEl.style.display === "none" ? "block" : "none";
    this._gridEl.style.display = display;
  }

  private _renderChart(svg: SVGSVGElement) {
    // Clear
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const width = 800;
    const height = this._config.height;
    const padding = { left: 48, right: 24, top: 16, bottom: 36 };

    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    // Axes
    const axes = document.createElementNS(svg.namespaceURI, "g");
    const xAxis = document.createElementNS(svg.namespaceURI, "line");
    xAxis.setAttribute("x1", String(padding.left));
    xAxis.setAttribute("y1", String(height - padding.bottom));
    xAxis.setAttribute("x2", String(width - padding.right));
    xAxis.setAttribute("y2", String(height - padding.bottom));
    xAxis.setAttribute("stroke", "currentColor");
    xAxis.setAttribute("stroke-opacity", "0.3");
    axes.appendChild(xAxis);
    const yAxis = document.createElementNS(svg.namespaceURI, "line");
    yAxis.setAttribute("x1", String(padding.left));
    yAxis.setAttribute("y1", String(padding.top));
    yAxis.setAttribute("x2", String(padding.left));
    yAxis.setAttribute("y2", String(height - padding.bottom));
    yAxis.setAttribute("stroke", "currentColor");
    yAxis.setAttribute("stroke-opacity", "0.3");
    axes.appendChild(yAxis);
    svg.appendChild(axes);

    const labels = this._data.labels;
    const series = this._data.series;
    const maxVal = Math.max(
      1,
      ...series.map((s) => Math.max(...s.values)),
      this._data.chartType === "stackedBar"
        ? labels.map((_, i) => series.reduce((acc, s) => acc + (s.values[i] ?? 0), 0)).reduce((a, b) => Math.max(a, b), 0)
        : 0
    );

    // X labels
    const stepX = plotW / Math.max(1, labels.length - 1);
    labels.forEach((lab, i) => {
      const tx = document.createElementNS(svg.namespaceURI, "text");
      tx.setAttribute("x", String(padding.left + (labels.length === 1 ? 0 : i * stepX)));
      tx.setAttribute("y", String(height - padding.bottom + 18));
      tx.setAttribute("text-anchor", "middle");
      tx.setAttribute("font-size", "10");
      tx.setAttribute("fill", "currentColor");
      tx.setAttribute("fill-opacity", "0.7");
      tx.textContent = lab;
      svg.appendChild(tx);
    });

    const scaleY = (v: number) => padding.top + (1 - v / maxVal) * plotH;

    if (this._data.chartType === "line") {
      series.forEach((s, sIdx) => {
        const color = s.color || this._config.palette[sIdx % this._config.palette.length];
        const path = document.createElementNS(svg.namespaceURI, "path");
        const d = s.values
          .map((v, i) => {
            const x = padding.left + (labels.length === 1 ? 0 : i * stepX);
            const y = scaleY(v);
            return `${i === 0 ? "M" : "L"}${x},${y}`;
          })
          .join(" ");
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", "2");
        svg.appendChild(path);

        // points
        s.values.forEach((v, i) => {
          const cx = padding.left + (labels.length === 1 ? 0 : i * stepX);
          const cy = scaleY(v);
          const circ = document.createElementNS(svg.namespaceURI, "circle");
          circ.setAttribute("cx", String(cx));
          circ.setAttribute("cy", String(cy));
          circ.setAttribute("r", "3");
          circ.setAttribute("fill", color);
          svg.appendChild(circ);
        });
      });
      return;
    }

    // bar-like charts
    const groupCount = labels.length;
    const barGroupWidth = plotW / groupCount;
    const groupPadding = 0.2 * barGroupWidth;
    const innerWidth = barGroupWidth - groupPadding * 2;

    if (this._data.chartType === "bar") {
      // Use first series only
      const s = series[0] || { values: [] };
      const barW = innerWidth * 0.6;
      s.values.forEach((v, i) => {
        const x = padding.left + i * barGroupWidth + groupPadding + innerWidth * 0.2;
        const y = scaleY(v);
        const rect = document.createElementNS(svg.namespaceURI, "rect");
        rect.setAttribute("x", String(x));
        rect.setAttribute("y", String(y));
        rect.setAttribute("width", String(barW));
        rect.setAttribute("height", String(height - padding.bottom - y));
        rect.setAttribute("fill", s.color || this._config.palette[0]);
        svg.appendChild(rect);
      });
      return;
    }

    if (this._data.chartType === "groupedBar") {
      const perBar = innerWidth / Math.max(1, series.length);
      series.forEach((s, sIdx) => {
        const color = s.color || this._config.palette[sIdx % this._config.palette.length];
        s.values.forEach((v, i) => {
          const x = padding.left + i * barGroupWidth + groupPadding + perBar * sIdx;
          const y = scaleY(v);
          const rect = document.createElementNS(svg.namespaceURI, "rect");
          rect.setAttribute("x", String(x));
          rect.setAttribute("y", String(y));
          rect.setAttribute("width", String(perBar * 0.9));
          rect.setAttribute("height", String(height - padding.bottom - y));
          rect.setAttribute("fill", color);
          svg.appendChild(rect);
        });
      });
      return;
    }

    if (this._data.chartType === "stackedBar") {
      labels.forEach((_, i) => {
        let yCursor = height - padding.bottom;
        series.forEach((s, sIdx) => {
          const v = s.values[i] ?? 0;
          const color = s.color || this._config.palette[sIdx % this._config.palette.length];
          const yTop = scaleY((height - padding.bottom - yCursor) / plotH * maxVal + v);
          const x = padding.left + i * barGroupWidth + groupPadding + innerWidth * 0.2;
          const barW = innerWidth * 0.6;
          const rect = document.createElementNS(svg.namespaceURI, "rect");
          rect.setAttribute("x", String(x));
          rect.setAttribute("y", String(yTop));
          rect.setAttribute("width", String(barW));
          rect.setAttribute("height", String(yCursor - yTop));
          rect.setAttribute("fill", color);
          svg.appendChild(rect);
          yCursor = yTop;
        });
      });
      return;
    }
  }

  render(): HTMLElement {
    return this._holderNode;
  }

  save(): ChartData {
    return { ...this._data };
  }

  static get sanitize(): SanitizerConfig {
    return {
      title: true,
      labels: true,
      series: true,
      chartType: true,
    } as any;
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  // Build a simple column editor for labels and series values
  private _buildGridEditor(): void {
    if (!this._gridEl) return;
    this._gridEl.innerHTML = "";
    const table = document.createElement("table");
    table.className = this._CSS.table;

    // Header row
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    const corner = document.createElement("th");
    corner.className = this._CSS.th;
    corner.textContent = "Series / Labels";
    hr.appendChild(corner);

    this._data.labels.forEach((lab, i) => {
      const th = document.createElement("th");
      th.className = this._CSS.th;
      const inp = document.createElement("input");
      inp.type = "text";
      inp.value = lab;
      inp.className = this._CSS.input;
      inp.addEventListener("input", () => {
        this._data.labels[i] = inp.value;
        if (this._svgEl) this._renderChart(this._svgEl);
      });
      th.appendChild(inp);
      // remove column button
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "×";
      del.className = `${this._CSS.btn} ml-1`;
      del.addEventListener("click", () => this._removeLabel(i));
      th.appendChild(del);
      hr.appendChild(th);
    });
    // add column
    const addCol = document.createElement("th");
    addCol.className = this._CSS.th;
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "+ Label";
    addBtn.className = this._CSS.btn;
    addBtn.addEventListener("click", () => this._addLabel());
    addCol.appendChild(addBtn);
    hr.appendChild(addCol);
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    this._data.series.forEach((s, sIdx) => {
      const tr = document.createElement("tr");
      const nameCell = document.createElement("td");
      nameCell.className = this._CSS.td;
      const nameInp = document.createElement("input");
      nameInp.type = "text";
      nameInp.value = s.name || `Series ${sIdx + 1}`;
      nameInp.className = this._CSS.input;
      nameInp.addEventListener("input", () => (this._data.series[sIdx].name = nameInp.value));
      nameCell.appendChild(nameInp);
      // color
      const colorInp = document.createElement("input");
      colorInp.type = "color";
      colorInp.value = s.color || this._autoColor(sIdx);
      colorInp.className = this._CSS.color;
      colorInp.addEventListener("input", () => (this._data.series[sIdx].color = colorInp.value));
      nameCell.appendChild(colorInp);
      // remove series
      const rm = document.createElement("button");
      rm.type = "button";
      rm.textContent = "×";
      rm.className = `${this._CSS.btn} ml-1`;
      rm.addEventListener("click", () => this._removeSeries(sIdx));
      nameCell.appendChild(rm);
      tr.appendChild(nameCell);

      // value cells
      this._ensureSeriesLength(sIdx);
      this._data.labels.forEach((_, i) => {
        const td = document.createElement("td");
        td.className = this._CSS.td;
        const val = document.createElement("input");
        val.type = "number";
        val.step = "any";
        val.value = String(this._data.series[sIdx].values[i] ?? 0);
        val.className = this._CSS.input;
        val.addEventListener("input", () => {
          const n = parseFloat(val.value);
          this._data.series[sIdx].values[i] = Number.isFinite(n) ? n : 0;
          if (this._svgEl) this._renderChart(this._svgEl);
        });
        td.appendChild(val);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    // add series row
    const addRow = document.createElement("tr");
    const addCell = document.createElement("td");
    addCell.className = this._CSS.td;
    const addSeriesBtn = document.createElement("button");
    addSeriesBtn.type = "button";
    addSeriesBtn.textContent = "+ Series";
    addSeriesBtn.className = this._CSS.btn;
    addSeriesBtn.addEventListener("click", () => this._addSeries());
    addCell.appendChild(addSeriesBtn);
    addRow.appendChild(addCell);
    tbody.appendChild(addRow);

    table.appendChild(tbody);
    this._gridEl.appendChild(table);
  }

  private _autoColor(idx: number): string {
    return this._config.palette[idx % this._config.palette.length];
  }

  private _ensureSeriesLength(sIdx: number) {
    const need = this._data.labels.length;
    const arr = this._data.series[sIdx].values;
    while (arr.length < need) arr.push(0);
    if (arr.length > need) arr.splice(need);
  }

  private _addLabel() {
    const next = `Label ${this._data.labels.length + 1}`;
    this._data.labels.push(next);
    this._data.series.forEach((s) => s.values.push(0));
    if (this._svgEl) this._renderChart(this._svgEl);
    this._buildGridEditor();
  }

  private _removeLabel(i: number) {
    if (i < 0 || i >= this._data.labels.length) return;
    this._data.labels.splice(i, 1);
    this._data.series.forEach((s) => s.values.splice(i, 1));
    if (this._svgEl) this._renderChart(this._svgEl);
    this._buildGridEditor();
  }

  private _addSeries() {
    const sIdx = this._data.series.length;
    this._data.series.push({ name: `Series ${sIdx + 1}`, values: new Array(this._data.labels.length).fill(0), color: this._autoColor(sIdx) });
    if (this._svgEl) this._renderChart(this._svgEl);
    this._buildGridEditor();
  }

  private _removeSeries(i: number) {
    if (i < 0 || i >= this._data.series.length) return;
    this._data.series.splice(i, 1);
    if (this._svgEl) this._renderChart(this._svgEl);
    this._buildGridEditor();
  }
}


