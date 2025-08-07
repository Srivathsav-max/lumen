import type { OutputData } from "@editorjs/editorjs";

/**
 * HTML Import/Export Plugin for EditorJS
 * Converts between EditorJS JSON format and HTML
 */
export class HTMLImportExportPlugin {
  /**
   * Convert HTML string to EditorJS data format
   */
  static async importFromHTML(htmlString: string): Promise<OutputData> {
    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString.trim();

    const blocks: any[] = [];
    let blockId = 0;

    // Process each child element
    Array.from(tempDiv.children).forEach((element) => {
      const block = this.parseHTMLElement(element as HTMLElement, blockId++);
      if (block) {
        blocks.push(block);
      }
    });

    return {
      time: Date.now(),
      blocks: blocks,
      version: "2.28.2"
    };
  }

  /**
   * Convert EditorJS data to HTML string
   */
  static exportToHTML(data: OutputData): string {
    if (!data.blocks || data.blocks.length === 0) {
      return "";
    }

    return data.blocks
      .map((block) => this.blockToHTML(block))
      .filter(Boolean)
      .join("\n");
  }

  /**
   * Parse a single HTML element into an EditorJS block
   */
  private static parseHTMLElement(element: HTMLElement, id: number): any | null {
    const tagName = element.tagName.toLowerCase();
    const textContent = this.getTextContent(element);

    switch (tagName) {
      case 'p':
        return {
          id: `block_${id}`,
          type: "paragraph",
          data: {
            text: element.innerHTML || ""
          }
        };

      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return {
          id: `block_${id}`,
          type: "header",
          data: {
            text: textContent,
            level: parseInt(tagName.charAt(1))
          }
        };

      case 'blockquote':
        const cite = element.querySelector('cite');
        const quoteText = element.innerHTML.replace(cite?.outerHTML || '', '').trim();
        return {
          id: `block_${id}`,
          type: "quote",
          data: {
            text: quoteText,
            caption: cite?.textContent || "",
            alignment: "left"
          }
        };

      case 'ul':
        const isChecklist = element.classList.contains('checklist') || 
                           element.querySelector('input[type="checkbox"]');
        
        if (isChecklist) {
          const items = Array.from(element.querySelectorAll('li')).map(li => {
            const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement;
            const text = li.textContent?.replace(/^\s*/, '') || '';
            return {
              text: text,
              checked: checkbox?.checked || false
            };
          });

          return {
            id: `block_${id}`,
            type: "checklist",
            data: { items }
          };
        } else {
          const items = Array.from(element.querySelectorAll('li')).map(li => li.innerHTML);
          return {
            id: `block_${id}`,
            type: "list",
            data: {
              style: "unordered",
              items: items
            }
          };
        }

      case 'ol':
        const listItems = Array.from(element.querySelectorAll('li')).map(li => li.innerHTML);
        return {
          id: `block_${id}`,
          type: "list",
          data: {
            style: "ordered",
            items: listItems
          }
        };

      case 'pre':
        const code = element.querySelector('code');
        const codeText = code?.textContent || element.textContent || '';
        const languageClass = code?.className.match(/language-(\w+)/);
        const language = languageClass ? languageClass[1] : '';

        return {
          id: `block_${id}`,
          type: "code",
          data: {
            code: codeText,
            language: language
          }
        };

      case 'img':
        return {
          id: `block_${id}`,
          type: "image",
          data: {
            url: element.getAttribute('src') || '',
            caption: element.getAttribute('alt') || '',
            withBorder: false,
            withBackground: false,
            stretched: false
          }
        };

      case 'figure':
        const img = element.querySelector('img');
        const figcaption = element.querySelector('figcaption');
        
        if (img) {
          return {
            id: `block_${id}`,
            type: "image",
            data: {
              url: img.getAttribute('src') || '',
              caption: figcaption?.textContent || img.getAttribute('alt') || '',
              withBorder: false,
              withBackground: false,
              stretched: false
            }
          };
        }
        break;

      case 'table':
        const rows = Array.from(element.querySelectorAll('tr'));
        const hasHeadings = element.querySelector('th') !== null;
        const content: string[][] = [];

        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('td, th'));
          const rowData = cells.map(cell => cell.innerHTML);
          content.push(rowData);
        });

        return {
          id: `block_${id}`,
          type: "table",
          data: {
            withHeadings: hasHeadings,
            content: content
          }
        };

      case 'hr':
        return {
          id: `block_${id}`,
          type: "divider",
          data: {
            type: element.classList.contains('star') ? 'star' : 'line'
          }
        };

      default:
        // Try to handle as paragraph if it has text content
        if (textContent.trim()) {
          return {
            id: `block_${id}`,
            type: "paragraph",
            data: {
              text: element.innerHTML || textContent
            }
          };
        }
        return null;
    }

    return null;
  }

  /**
   * Convert a single EditorJS block to HTML
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
        return block.data.type === "star" ? '<hr class="star">' : "<hr>";

      default:
        // Try to handle unknown blocks gracefully
        if (block.data?.text) {
          return `<p>${block.data.text}</p>`;
        }
        return "";
    }
  }

  /**
   * Get clean text content from an element
   */
  private static getTextContent(element: HTMLElement): string {
    return element.textContent || element.innerText || "";
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
   * Import HTML from file
   */
  static async importFromFile(file: File): Promise<OutputData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const html = e.target?.result as string;
          const data = await this.importFromHTML(html);
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }

  /**
   * Export to HTML file and download
   */
  static exportToFile(data: OutputData, filename: string = "document.html", title: string = "Exported Document"): void {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            color: #333;
        }
        blockquote { 
            border-left: 4px solid #ddd; 
            margin: 0; 
            padding-left: 20px; 
            font-style: italic; 
            color: #666;
        }
        code { 
            background: #f4f4f4; 
            padding: 2px 4px; 
            border-radius: 3px; 
            font-family: 'Monaco', 'Courier New', monospace;
        }
        pre { 
            background: #f4f4f4; 
            padding: 15px; 
            border-radius: 5px; 
            overflow-x: auto; 
        }
        pre code {
            background: none;
            padding: 0;
        }
        table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 20px 0; 
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
        }
        th { 
            background-color: #f2f2f2; 
            font-weight: bold;
        }
        img { 
            max-width: 100%; 
            height: auto; 
        }
        figure { 
            margin: 20px 0; 
            text-align: center;
        }
        figcaption { 
            font-size: 14px; 
            color: #666; 
            text-align: center; 
            margin-top: 5px; 
            font-style: italic;
        }
        .checklist { 
            list-style: none; 
            padding-left: 0;
        }
        .checklist li {
            margin: 5px 0;
        }
        .checklist input { 
            margin-right: 8px; 
        }
        hr { 
            border: none; 
            border-top: 1px solid #ddd; 
            margin: 30px 0;
        }
        hr.star { 
            border: none; 
            text-align: center; 
            margin: 30px 0;
        }
        hr.star::before { 
            content: "⭐ ⭐ ⭐"; 
            color: #666;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #333;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        ul, ol {
            margin: 15px 0;
            padding-left: 30px;
        }
        li {
            margin: 5px 0;
        }
    </style>
</head>
<body>
${this.exportToHTML(data)}
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
