import type { OutputData } from "@editorjs/editorjs";

/**
 * Export/Import service for EditorJS content
 */
export class ExportImportService {
  /**
   * Convert EditorJS data to HTML
   */
  static toHTML(data: OutputData): string {
    if (!data.blocks || data.blocks.length === 0) {
      return "";
    }

    return data.blocks
      .map((block) => this.blockToHTML(block))
      .filter(Boolean)
      .join("\n");
  }

  /**
   * Convert EditorJS data to Markdown
   */
  static toMarkdown(data: OutputData): string {
    if (!data.blocks || data.blocks.length === 0) {
      return "";
    }

    return data.blocks
      .map((block) => this.blockToMarkdown(block))
      .filter(Boolean)
      .join("\n\n");
  }

  /**
   * Convert a single block to HTML
   */
  private static blockToHTML(block: any): string {
    switch (block.type) {
      case "paragraph":
        return `<p>${block.data.text || ""}</p>`;

      case "header":
        const level = block.data.level || 1;
        return `<h${level}>${block.data.text || ""}</h${level}>`;

      case "quote":
        const quoteCaption = block.data.caption ? `<cite>${block.data.caption}</cite>` : "";
        return `<blockquote><p>${block.data.text || ""}</p>${quoteCaption}</blockquote>`;

      case "list":
        if (!block.data.items || !Array.isArray(block.data.items)) return "";
        const listTag = block.data.style === "ordered" ? "ol" : "ul";
        const listItems = block.data.items
          .map((item: string) => `<li>${item}</li>`)
          .join("");
        return `<${listTag}>${listItems}</${listTag}>`;

      case "checklist":
        if (!block.data.items || !Array.isArray(block.data.items)) return "";
        const checklistItems = block.data.items
          .map((item: any) => {
            const checked = item.checked ? "checked" : "";
            return `<li><input type="checkbox" ${checked} disabled> ${item.text || ""}</li>`;
          })
          .join("");
        return `<ul class="checklist">${checklistItems}</ul>`;

      case "code":
        const language = block.data.language ? ` class="language-${block.data.language}"` : "";
        return `<pre><code${language}>${this.escapeHtml(block.data.code || "")}</code></pre>`;

      case "image":
        const src = block.data.file?.url || block.data.url || "";
        const alt = block.data.caption || "";
        const imageCaption = block.data.caption ? `<figcaption>${block.data.caption}</figcaption>` : "";
        return `<figure><img src="${src}" alt="${alt}">${imageCaption}</figure>`;

      case "table":
        if (!block.data.content || !Array.isArray(block.data.content)) return "";
        const hasHeadings = block.data.withHeadings;
        let tableHTML = "<table>";
        
        block.data.content.forEach((row: string[], rowIndex: number) => {
          const isHeaderRow = hasHeadings && rowIndex === 0;
          const tag = isHeaderRow ? "th" : "td";
          const rowHTML = row.map(cell => `<${tag}>${cell || ""}</${tag}>`).join("");
          tableHTML += `<tr>${rowHTML}</tr>`;
        });
        
        tableHTML += "</table>";
        return tableHTML;

      case "divider":
        return block.data.type === "star" ? "<hr class=\"star\">" : "<hr>";

      default:
        // Try to handle unknown blocks gracefully
        if (block.data?.text) {
          return `<p>${block.data.text}</p>`;
        }
        return "";
    }
  }

  /**
   * Convert a single block to Markdown
   */
  private static blockToMarkdown(block: any): string {
    switch (block.type) {
      case "paragraph":
        return block.data.text || "";

      case "header":
        const level = block.data.level || 1;
        const hashes = "#".repeat(level);
        return `${hashes} ${this.stripHtml(block.data.text || "")}`;

      case "quote":
        const text = this.stripHtml(block.data.text || "");
        const markdownCaption = block.data.caption ? `\n\n— ${this.stripHtml(block.data.caption)}` : "";
        return `> ${text}${markdownCaption}`;

      case "list":
        if (!block.data.items || !Array.isArray(block.data.items)) return "";
        const isOrdered = block.data.style === "ordered";
        return block.data.items
          .map((item: string, index: number) => {
            const bullet = isOrdered ? `${index + 1}.` : "-";
            return `${bullet} ${this.stripHtml(item)}`;
          })
          .join("\n");

      case "checklist":
        if (!block.data.items || !Array.isArray(block.data.items)) return "";
        return block.data.items
          .map((item: any) => {
            const checked = item.checked ? "[x]" : "[ ]";
            return `- ${checked} ${this.stripHtml(item.text || "")}`;
          })
          .join("\n");

      case "code":
        const language = block.data.language || "";
        return `\`\`\`${language}\n${block.data.code || ""}\n\`\`\``;

      case "image":
        const src = block.data.file?.url || block.data.url || "";
        const alt = block.data.caption || "Image";
        return `![${alt}](${src})`;

      case "table":
        if (!block.data.content || !Array.isArray(block.data.content)) return "";
        const hasHeadings = block.data.withHeadings;
        let markdown = "";
        
        block.data.content.forEach((row: string[], rowIndex: number) => {
          const cells = row.map(cell => this.stripHtml(cell || "")).join(" | ");
          markdown += `| ${cells} |\n`;
          
          // Add separator after header row
          if (hasHeadings && rowIndex === 0) {
            const separator = row.map(() => "---").join(" | ");
            markdown += `| ${separator} |\n`;
          }
        });
        
        return markdown.trim();

      case "divider":
        return "---";

      default:
        // Try to handle unknown blocks gracefully
        if (block.data?.text) {
          return this.stripHtml(block.data.text);
        }
        return "";
    }
  }

  /**
   * Strip HTML tags from text
   */
  private static stripHtml(html: string): string {
    if (typeof window !== "undefined") {
      const div = document.createElement("div");
      div.innerHTML = html;
      return div.textContent || div.innerText || "";
    }
    // Fallback for server-side
    return html.replace(/<[^>]*>/g, "");
  }

  /**
   * Escape HTML characters
   */
  private static escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Download content as file
   */
  static downloadFile(content: string, filename: string, mimeType: string = "text/plain"): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export as HTML file
   */
  static exportHTML(data: OutputData, filename: string = "document.html"): void {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported Document</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 20px; font-style: italic; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        img { max-width: 100%; height: auto; }
        figure { margin: 20px 0; }
        figcaption { font-size: 14px; color: #666; text-align: center; margin-top: 5px; }
        .checklist { list-style: none; }
        .checklist input { margin-right: 8px; }
        hr.star { border: none; text-align: center; }
        hr.star::before { content: "⭐ ⭐ ⭐"; }
    </style>
</head>
<body>
${this.toHTML(data)}
</body>
</html>`;
    this.downloadFile(html, filename, "text/html");
  }

  /**
   * Export as Markdown file
   */
  static exportMarkdown(data: OutputData, filename: string = "document.md"): void {
    const markdown = this.toMarkdown(data);
    this.downloadFile(markdown, filename, "text/markdown");
  }
}
