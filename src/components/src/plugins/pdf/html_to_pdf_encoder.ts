import { Document, Page, Widget, TextStyle, Font, Context, MultiPage, Paragraph, SizedBox, RichText, TextSpan, Text, Header, Bullet, Checkbox, Row, Wrap, Table, TableRow, TableBorder, Image, MemoryImage, BoxDecoration, TextDecoration, FontWeight, FontStyle, TextAlign, TweenSequence, TweenSequenceItem } from '../../../infra/pdf_widgets';
import { PdfColors } from '../../../infra/pdf_colors';
import { HTMLTags } from '../html/html_tags';
import { ParagraphBlockKeys } from '../../block_component/paragraph/paragraph_keys';
import { BuiltInAttributeKey } from '../../core/attributes';
import { TodoListBlockKeys } from '../../block_component/todo_list/todo_list_keys';
import { BulletedListBlockKeys } from '../../block_component/bulleted_list/bulleted_list_keys';
import { NumberedListBlockKeys } from '../../block_component/numbered_list/numbered_list_keys';
import { ColorExt } from './extension/color_ext';
import { markdownToHtml } from 'markdown-it';
import { parse, Element, Node as DomNode, Text as DomText } from 'node-html-parser';

/**
 * This class handles conversion from html to pdf
 */
export class PdfHTMLEncoder {
  private font?: Font;
  private fontFallback: Font[];

  constructor(options: {
    font?: Font;
    fontFallback: Font[];
  }) {
    this.font = options.font;
    this.fontFallback = options.fontFallback;
  }

  async convert(input: string): Promise<Document> {
    const md = markdownToHtml();
    const htmlx = md.render(input, {
      html: true,
      breaks: false,
      linkify: false,
    });
    
    const document = parse(htmlx);
    const body = document.querySelector('body');
    
    if (!body) {
      const blank = new Document();
      blank.addPage(
        new Page({
          build: (context: Context) => {
            return new SizedBox({ width: 0, height: 0 });
          },
        })
      );
      return blank;
    }

    const nodes = await this.parseElement(body.childNodes);
    const newPdf = new Document();
    newPdf.addPage(
      new MultiPage({
        build: (context: Context) => nodes,
      })
    );
    return newPdf;
  }

  private async parseElement(
    domNodes: DomNode[],
    options: {
      type?: string;
      textAlign?: TextAlign;
    } = {}
  ): Promise<Widget[]> {
    const { type, textAlign } = options;
    const textSpan: TextSpan[] = [];
    const nodes: Widget[] = [];

    for (const domNode of domNodes) {
      if (domNode.nodeType === 1) { // Element node
        const element = domNode as Element;
        const localName = element.tagName.toLowerCase();
        
        if (localName === HTMLTags.br) {
          textSpan.push(new TextSpan({ text: '\\n' }));
        } else if (HTMLTags.formattingElements.includes(localName)) {
          const attributes = this.parseFormattingElementAttributes(element);
          nodes.push(
            new Paragraph({
              text: element.text,
              style: attributes.style,
            })
          );
        } else if (HTMLTags.specialElements.includes(localName)) {
          if (textSpan.length > 0) {
            const newTextSpanList = [...textSpan];
            nodes.push(
              new SizedBox({
                width: Number.MAX_SAFE_INTEGER,
                child: new RichText({
                  textAlign,
                  text: new TextSpan({
                    children: newTextSpanList,
                    style: new TextStyle({ font: this.font, fontFallback: this.fontFallback }),
                  }),
                }),
              })
            );
            textSpan.length = 0;
          }
          nodes.push(
            ...await this.parseSpecialElements(element, {
              type: type || ParagraphBlockKeys.type,
            })
          );
        }
      } else if (domNode.nodeType === 3) { // Text node
        const textNode = domNode as DomText;
        if (textNode.text.trim().length > 0 && textSpan.length > 0) {
          const newTextSpanList = [...textSpan];
          nodes.push(
            new SizedBox({
              width: Number.MAX_SAFE_INTEGER,
              child: new RichText({
                textAlign,
                text: new TextSpan({
                  children: newTextSpanList,
                  style: new TextStyle({ font: this.font, fontFallback: this.fontFallback }),
                }),
              }),
            })
          );
          textSpan.length = 0;
        }
        nodes.push(
          new Text({
            text: textNode.text,
            style: new TextStyle({ font: this.font, fontFallback: this.fontFallback }),
          })
        );
      } else {
        console.assert(false, `Unknown node type: ${domNode}`);
      }
    }

    if (textSpan.length > 0) {
      const newTextSpanList = [...textSpan];
      nodes.push(
        new SizedBox({
          width: Number.MAX_SAFE_INTEGER,
          child: new RichText({
            textAlign,
            text: new TextSpan({
              children: newTextSpanList,
              style: new TextStyle({ font: this.font, fontFallback: this.fontFallback }),
            }),
          }),
        })
      );
    }
    return nodes;
  }

  private async parseSpecialElements(
    element: Element,
    options: { type: string }
  ): Promise<Widget[]> {
    const { type } = options;
    const localName = element.tagName.toLowerCase();
    
    switch (localName) {
      case HTMLTags.h1:
        return [this.parseHeadingElement(element, { level: 1 })];
      case HTMLTags.h2:
        return [this.parseHeadingElement(element, { level: 2 })];
      case HTMLTags.h3:
        return [this.parseHeadingElement(element, { level: 3 })];
      case HTMLTags.h4:
        return [this.parseHeadingElement(element, { level: 4 })];
      case HTMLTags.h5:
        return [this.parseHeadingElement(element, { level: 5 })];
      case HTMLTags.h6:
        return [this.parseHeadingElement(element, { level: 6 })];
      case HTMLTags.unorderedList:
        return this.parseUnOrderListElement(element);
      case HTMLTags.orderedList:
        return this.parseOrderListElement(element);
      case HTMLTags.table:
        return this.parseRawTableData(element);
      case HTMLTags.list:
        return [this.parseListElement(element, { type })];
      case HTMLTags.paragraph:
        return [await this.parseParagraphElement(element)];
      case HTMLTags.image:
        return [await this.parseImageElement(element)];
      default:
        return [await this.parseParagraphElement(element)];
    }
  }

  private async parseRawTableData(element: Element): Promise<Widget[]> {
    const tableRows: TableRow[] = [];

    const rows = element.querySelectorAll('tr');
    for (const row of rows) {
      const rowData: Widget[] = [];
      for (const cell of row.childNodes.filter(n => n.nodeType === 1)) {
        const cellElement = cell as Element;
        const cellContent: Widget[] = [];
        
        // Handle nested HTML tags within table cells
        for (const node of cellElement.childNodes) {
          if (node.nodeType === 1) { // Element node
            const nodeElement = node as Element;
            if (HTMLTags.formattingElements.includes(nodeElement.tagName.toLowerCase())) {
              const attributes = this.parseFormattingElementAttributes(nodeElement);
              cellContent.push(
                new Text({
                  text: nodeElement.text,
                  style: attributes.style,
                })
              );
            }
            if (HTMLTags.specialElements.includes(nodeElement.tagName.toLowerCase())) {
              cellContent.push(
                ...await this.parseSpecialElements(nodeElement, {
                  type: BuiltInAttributeKey.bulletedList,
                })
              );
            }
          } else if (node.nodeType === 3) { // Text node
            const textNode = node as DomText;
            cellContent.push(
              new Text({
                text: textNode.text,
                style: new TextStyle({ font: this.font, fontFallback: this.fontFallback }),
              })
            );
          }
        }

        rowData.push(new Wrap({ children: cellContent }));
      }
      tableRows.push(new TableRow({ children: rowData }));
    }
    
    return [
      new Table({
        children: tableRows,
        border: TableBorder.all({ color: PdfColors.black }),
      }),
    ];
  }

  private parseFormattingElementAttributes(element: Element): {
    textAlign?: TextAlign;
    style: TextStyle;
  } {
    const localName = element.tagName.toLowerCase();
    let textAlign: TextAlign | undefined;
    let attributes = new TextStyle({ 
      fontFallback: this.fontFallback, 
      font: this.font 
    });
    const decoration: TextDecoration[] = [];

    switch (localName) {
      case HTMLTags.bold:
      case HTMLTags.strong:
        attributes = attributes.copyWith({ fontWeight: FontWeight.bold });
        break;
      case HTMLTags.italic:
      case HTMLTags.em:
        attributes = attributes.copyWith({ fontStyle: FontStyle.italic });
        break;
      case HTMLTags.underline:
        decoration.push(TextDecoration.underline);
        break;
      case HTMLTags.del:
        attributes = attributes.copyWith({ decoration: TextDecoration.lineThrough });
        break;
      case HTMLTags.anchor:
        const href = element.getAttribute('href');
        if (href) {
          decoration.push(TextDecoration.underline);
          attributes = attributes.copyWith({ color: PdfColors.blue });
        }
        break;
      case HTMLTags.code:
        attributes = attributes.copyWith({
          background: new BoxDecoration({ color: PdfColors.grey }),
        });
        break;
      default:
        break;
    }

    for (const child of element.childNodes.filter(n => n.nodeType === 1)) {
      const childElement = child as Element;
      const formattedAttrs = this.parseFormattingElementAttributes(childElement);
      attributes = attributes.merge(formattedAttrs.style);
      if (formattedAttrs.style.decoration) {
        decoration.push(formattedAttrs.style.decoration);
        textAlign = formattedAttrs.textAlign;
      }
    }

    return {
      textAlign,
      style: attributes.copyWith({ 
        decoration: TextDecoration.combine(decoration) 
      }),
    };
  }

  private parseHeadingElement(element: Element, options: { level: number }): Widget {
    const { level } = options;
    let textAlign: TextAlign | undefined;
    const textSpan: TextSpan[] = [];
    const children = element.childNodes;

    for (const child of children) {
      if (child.nodeType === 1) { // Element node
        const childElement = child as Element;
        const attributes = this.parseFormattingElementAttributes(childElement);
        textAlign = attributes.textAlign;
        textSpan.push(
          new TextSpan({
            text: childElement.text,
            style: attributes.style,
          })
        );
      } else {
        const textNode = child as DomText;
        textSpan.push(
          new TextSpan({
            text: textNode.text,
            style: new TextStyle({ font: this.font, fontFallback: this.fontFallback }),
          })
        );
      }
    }

    return new Header({
      level,
      child: new RichText({
        textAlign,
        text: new TextSpan({
          children: textSpan,
          style: new TextStyle({
            fontSize: this.getHeadingSize(level),
            fontWeight: FontWeight.bold,
            font: this.font,
            fontFallback: this.fontFallback,
          }),
        }),
      }),
    });
  }

  private parseUnOrderListElement(element: Element): Widget[] {
    const findTodos = element.childNodes
      .filter(n => n.nodeType === 1)
      .some(child => (child as Element).text.includes('['));
    
    if (findTodos) {
      return element.childNodes
        .filter(n => n.nodeType === 1)
        .map(child => this.parseListElement(child as Element, { 
          type: TodoListBlockKeys.type 
        }));
    } else {
      return element.childNodes
        .filter(n => n.nodeType === 1)
        .map(child => this.parseListElement(child as Element, { 
          type: BulletedListBlockKeys.type 
        }));
    }
  }

  private parseOrderListElement(element: Element): Widget[] {
    return element.childNodes
      .filter(n => n.nodeType === 1)
      .map(child => this.parseListElement(child as Element, { 
        type: NumberedListBlockKeys.type 
      }));
  }

  private parseListElement(element: Element, options: { type: string }): Widget {
    const { type } = options;
    
    // TODO: Handle Numbered Lists & Handle nested lists
    if (type === TodoListBlockKeys.type) {
      const bracketRightIndex = element.text.indexOf(']') + 1;
      const strippedString = element.text.substring(bracketRightIndex);
      const condition = element.text.includes('[x]');
      
      return new Row({
        children: [
          new Checkbox({
            width: 10,
            height: 10,
            name: element.text.substring(3, 6),
            value: condition,
          }),
          new Text({
            text: strippedString,
            style: new TextStyle({ font: this.font, fontFallback: this.fontFallback }),
          }),
        ],
      });
    } else {
      return new Bullet({
        text: element.text,
        style: new TextStyle({ font: this.font, fontFallback: this.fontFallback }),
      });
    }
  }

  private async parseParagraphElement(element: Element): Promise<Widget> {
    return this.parseDeltaElement(element);
  }

  private async parseImageElement(element: Element): Promise<Widget> {
    const src = element.getAttribute('src');
    try {
      if (src) {
        if (src.startsWith('https')) {
          const networkImage = await this.fetchImage(src);
          return new Image({ image: new MemoryImage(networkImage) });
        } else {
          // For local images, we'd need to read from file system
          // This would need to be adapted based on the environment
          const localImageData = await this.readLocalFile(src);
          return new Image({ image: new MemoryImage(localImageData) });
        }
      } else {
        return new Text({ text: '' });
      }
    } catch (e) {
      return new Text({ text: String(e) });
    }
  }

  private async fetchImage(url: string): Promise<Uint8Array> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (e) {
      throw new Error(String(e));
    }
  }

  private async readLocalFile(path: string): Promise<Uint8Array> {
    // This would need to be implemented based on the environment
    // For now, return empty array
    return new Uint8Array();
  }

  private async parseDeltaElement(element: Element): Promise<Widget> {
    const textSpan: TextSpan[] = [];
    const children = element.childNodes;
    const subNodes: Widget[] = [];
    let textAlign: TextAlign | undefined;

    for (const child of children) {
      if (child.nodeType === 1) { // Element node
        const childElement = child as Element;
        if (childElement.childNodes.length > 0 &&
            !HTMLTags.formattingElements.includes(childElement.tagName.toLowerCase())) {
          // Rich editor for webs do this so handling that case for href
          subNodes.push(...await this.parseElement(childElement.childNodes));
        } else {
          if (HTMLTags.specialElements.includes(childElement.tagName.toLowerCase())) {
            subNodes.push(
              ...await this.parseSpecialElements(childElement, {
                type: ParagraphBlockKeys.type,
              })
            );
          } else {
            if (childElement.tagName.toLowerCase() === HTMLTags.br) {
              textSpan.push(new TextSpan({ text: '\\n' }));
            } else {
              const attributes = this.parseFormattingElementAttributes(childElement);
              textAlign = attributes.textAlign;
              textSpan.push(
                new TextSpan({
                  text: childElement.text.replace(/\\n+/g, ''),
                  style: attributes.style,
                })
              );
            }
          }
        }
      } else {
        const attributes = this.getDeltaAttributesFromHTMLAttributes(
          element.attributes || {}
        );
        textAlign = attributes.textAlign;
        const textNode = child as DomText;
        textSpan.push(
          new TextSpan({
            text: (textNode.text || '').replace(/\\n+/g, ''),
            style: attributes.style,
          })
        );
      }
    }

    return new Wrap({
      children: [
        new SizedBox({
          width: Number.MAX_SAFE_INTEGER,
          child: new RichText({
            textAlign,
            text: new TextSpan({
              children: textSpan,
              style: new TextStyle({ font: this.font, fontFallback: this.fontFallback }),
            }),
          }),
        }),
        ...subNodes,
      ],
    });
  }

  private static assignTextDecorations(
    style: TextStyle,
    decorationStr: string
  ): TextStyle {
    const decorations = decorationStr.split(' ');
    const textDecorations: TextDecoration[] = [];
    
    for (const type of decorations) {
      if (type === 'line-through') {
        textDecorations.push(TextDecoration.lineThrough);
      } else if (type === 'underline') {
        textDecorations.push(TextDecoration.underline);
      }
    }
    
    return style.copyWith({
      decoration: TextDecoration.combine(textDecorations),
    });
  }

  private getDeltaAttributesFromHTMLAttributes(
    htmlAttributes: Record<string, string>
  ): {
    textAlign?: TextAlign;
    style: TextStyle;
  } {
    let style = new TextStyle({ font: this.font, fontFallback: this.fontFallback });
    let textAlign: TextAlign | undefined;
    const cssInlineStyle = htmlAttributes['style'];
    const cssMap = this.getCssFromString(cssInlineStyle);

    // font weight
    const fontWeight = cssMap['font-weight'];
    if (fontWeight) {
      if (fontWeight === 'bold') {
        style = style.copyWith({ fontWeight: FontWeight.bold });
      } else {
        const weight = parseInt(fontWeight);
        if (!isNaN(weight) && weight >= 500) {
          style = style.copyWith({ fontWeight: FontWeight.bold });
        }
      }
    }

    // decoration
    const textDecoration = cssMap['text-decoration'];
    if (textDecoration) {
      style = PdfHTMLEncoder.assignTextDecorations(style, textDecoration);
    }

    // background color
    const backgroundColor = cssMap['background-color'];
    if (backgroundColor) {
      const highlightColor = ColorExt.fromRgbaString(backgroundColor);
      if (highlightColor) {
        style = style.copyWith({ 
          background: new BoxDecoration({ color: highlightColor }) 
        });
      }
    }

    // color
    const color = cssMap['color'];
    if (color) {
      const textColor = ColorExt.fromRgbaString(color);
      if (textColor) {
        style = style.copyWith({ color: textColor });
      }
    }

    // italic
    const fontStyle = cssMap['font-style'];
    if (fontStyle === 'italic') {
      style = style.copyWith({ fontStyle: FontStyle.italic });
    }

    // text align
    const alignment = cssMap['text-align'];
    if (alignment) {
      textAlign = this.alignText(alignment);
    }

    return { textAlign, style };
  }

  private alignText(alignment: string): TextAlign {
    switch (alignment) {
      case 'right':
        return TextAlign.right;
      case 'center':
        return TextAlign.center;
      case 'left':
        return TextAlign.left;
      case 'justify':
        return TextAlign.justify;
      default:
        return TextAlign.left;
    }
  }

  private getCssFromString(cssString?: string): Record<string, string> {
    const result: Record<string, string> = {};
    if (!cssString) {
      return result;
    }
    
    const entries = cssString.split(';');
    for (const entry of entries) {
      const tuples = entry.split(':');
      if (tuples.length < 2) {
        continue;
      }
      result[tuples[0].trim()] = tuples[1].trim();
    }
    return result;
  }

  private getHeadingSize(level: number): number {
    switch (level) {
      case 1:
        return 32;
      case 2:
        return 28;
      case 3:
        return 20;
      case 4:
        return 17;
      case 5:
        return 14;
      case 6:
        return 10;
      default:
        return 32;
    }
  }
}