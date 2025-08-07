import type { OutputData } from "@editorjs/editorjs";

/**
 * Markdown Import/Export Plugin for EditorJS
 * Converts between EditorJS JSON format and Markdown
 */
export class MarkdownImportExportPlugin {
  /**
   * Convert Markdown string to EditorJS data format
   */
  static async importFromMarkdown(markdownString: string): Promise<OutputData> {
    const lines = markdownString.split('\n');
    const blocks: any[] = [];
    let blockId = 0;
    let currentBlock: any = null;
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLanguage = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          blocks.push({
            id: `block_${blockId++}`,
            type: "code",
            data: {
              code: codeBlockContent.join('\n'),
              language: codeBlockLanguage
            }
          });
          codeBlockContent = [];
          codeBlockLanguage = '';
          inCodeBlock = false;
        } else {
          // Start of code block
          codeBlockLanguage = trimmedLine.substring(3).trim();
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Handle headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        blocks.push({
          id: `block_${blockId++}`,
          type: "header",
          data: {
            text: headerMatch[2].trim(),
            level: headerMatch[1].length
          }
        });
        continue;
      }

      // Handle blockquotes
      if (trimmedLine.startsWith('> ')) {
        let quoteText = trimmedLine.substring(2);
        let caption = '';

        // Check for citation
        const citationMatch = quoteText.match(/^(.+)\n\n— (.+)$/);
        if (citationMatch) {
          quoteText = citationMatch[1];
          caption = citationMatch[2];
        }

        blocks.push({
          id: `block_${blockId++}`,
          type: "quote",
          data: {
            text: quoteText,
            caption: caption,
            alignment: "left"
          }
        });
        continue;
      }

      // Handle unordered lists and checklists
      const unorderedListMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
      if (unorderedListMatch) {
        const content = unorderedListMatch[2];
        
        // Check if it's a checklist
        const checklistMatch = content.match(/^\[([ x])\]\s+(.+)$/);
        if (checklistMatch) {
          // Handle checklist
          if (!currentBlock || currentBlock.type !== 'checklist') {
            currentBlock = {
              id: `block_${blockId++}`,
              type: "checklist",
              data: { items: [] }
            };
            blocks.push(currentBlock);
          }
          
          currentBlock.data.items.push({
            text: checklistMatch[2],
            checked: checklistMatch[1] === 'x'
          });
        } else {
          // Handle regular unordered list
          if (!currentBlock || currentBlock.type !== 'list' || currentBlock.data.style !== 'unordered') {
            currentBlock = {
              id: `block_${blockId++}`,
              type: "list",
              data: { 
                style: "unordered",
                items: [] 
              }
            };
            blocks.push(currentBlock);
          }
          
          currentBlock.data.items.push(content);
        }
        continue;
      }

      // Handle ordered lists
      const orderedListMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
      if (orderedListMatch) {
        if (!currentBlock || currentBlock.type !== 'list' || currentBlock.data.style !== 'ordered') {
          currentBlock = {
            id: `block_${blockId++}`,
            type: "list",
            data: { 
              style: "ordered",
              items: [] 
            }
          };
          blocks.push(currentBlock);
        }
        
        currentBlock.data.items.push(orderedListMatch[2]);
        continue;
      }

      // Handle dividers
      if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
        blocks.push({
          id: `block_${blockId++}`,
          type: "divider",
          data: { type: "line" }
        });
        currentBlock = null;
        continue;
      }

      // Handle images
      const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imageMatch) {
        blocks.push({
          id: `block_${blockId++}`,
          type: "image",
          data: {
            url: imageMatch[2],
            caption: imageMatch[1] || '',
            withBorder: false,
            withBackground: false,
            stretched: false
          }
        });
        continue;
      }

      // Handle tables
      if (trimmedLine.includes('|') && trimmedLine.length > 1) {
        const tableRows = [];
        let tableStartIndex = i;
        
        // Collect all table rows
        while (i < lines.length && lines[i].trim().includes('|')) {
          const row = lines[i].trim();
          if (row.match(/^\|?[\s\-\|]+\|?$/)) {
            // Skip separator row
            i++;
            continue;
          }
          
          const cells = row.split('|')
            .map(cell => cell.trim())
            .filter(cell => cell !== '');
          
          if (cells.length > 0) {
            tableRows.push(cells);
          }
          i++;
        }
        i--; // Adjust for the extra increment
        
        if (tableRows.length > 0) {
          blocks.push({
            id: `block_${blockId++}`,
            type: "table",
            data: {
              withHeadings: true, // Assume first row is header in markdown tables
              content: tableRows
            }
          });
        }
        currentBlock = null;
        continue;
      }

      // Handle paragraphs (including empty lines)
      if (trimmedLine === '') {
        currentBlock = null;
        continue;
      }

      // Regular paragraph
      blocks.push({
        id: `block_${blockId++}`,
        type: "paragraph",
        data: {
          text: this.parseInlineMarkdown(line)
        }
      });
      currentBlock = null;
    }

    return {
      time: Date.now(),
      blocks: blocks,
      version: "2.28.2"
    };
  }

  /**
   * Convert EditorJS data to Markdown string
   */
  static exportToMarkdown(data: OutputData): string {
    if (!data.blocks || data.blocks.length === 0) {
      return "";
    }

    return data.blocks
      .map((block) => this.blockToMarkdown(block))
      .filter(Boolean)
      .join("\n\n");
  }

  /**
   * Parse inline markdown formatting (bold, italic, code, etc.)
   */
  private static parseInlineMarkdown(text: string): string {
    // Convert markdown to HTML for EditorJS
    return text
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold
      .replace(/\*(.*?)\*/g, '<i>$1</i>') // Italic
      .replace(/`(.*?)`/g, '<code>$1</code>') // Inline code
      .replace(/~~(.*?)~~/g, '<s>$1</s>') // Strikethrough
      .replace(/__([^_]+)__/g, '<u>$1</u>'); // Underline (non-standard)
  }

  /**
   * Convert HTML formatting back to markdown
   */
  private static htmlToMarkdown(html: string): string {
    return html
      .replace(/<b>(.*?)<\/b>/g, '**$1**')
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<i>(.*?)<\/i>/g, '*$1*')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<code>(.*?)<\/code>/g, '`$1`')
      .replace(/<s>(.*?)<\/s>/g, '~~$1~~')
      .replace(/<u>(.*?)<\/u>/g, '__$1__')
      .replace(/<[^>]*>/g, ''); // Remove any remaining HTML tags
  }

  /**
   * Convert a single EditorJS block to Markdown
   */
  private static blockToMarkdown(block: any): string {
    switch (block.type) {
      case "paragraph":
        return this.htmlToMarkdown(block.data.text || "");

      case "header":
        const level = block.data.level || 1;
        const hashes = "#".repeat(level);
        return `${hashes} ${this.htmlToMarkdown(block.data.text || "")}`;

      case "quote":
        const text = this.htmlToMarkdown(block.data.text || "");
        const caption = block.data.caption ? `\n\n— ${this.htmlToMarkdown(block.data.caption)}` : "";
        return `> ${text}${caption}`;

      case "list":
        if (!block.data.items || !Array.isArray(block.data.items)) return "";
        const isOrdered = block.data.style === "ordered";
        return block.data.items
          .map((item: string, index: number) => {
            const bullet = isOrdered ? `${index + 1}.` : "-";
            return `${bullet} ${this.htmlToMarkdown(item)}`;
          })
          .join("\n");

      case "checklist":
        if (!block.data.items || !Array.isArray(block.data.items)) return "";
        return block.data.items
          .map((item: any) => {
            const checked = item.checked ? "[x]" : "[ ]";
            return `- ${checked} ${this.htmlToMarkdown(item.text || "")}`;
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
          const cells = row.map(cell => this.htmlToMarkdown(cell || "")).join(" | ");
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
          return this.htmlToMarkdown(block.data.text);
        }
        return "";
    }
  }

  /**
   * Import Markdown from file
   */
  static async importFromFile(file: File): Promise<OutputData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const markdown = e.target?.result as string;
          const data = await this.importFromMarkdown(markdown);
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
   * Export to Markdown file and download
   */
  static exportToFile(data: OutputData, filename: string = "document.md"): void {
    const markdown = this.exportToMarkdown(data);
    const blob = new Blob([markdown], { type: "text/markdown" });
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
