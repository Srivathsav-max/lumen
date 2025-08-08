import {
  type BlockToolConstructable,
  type EditorConfig,
  type ToolConfig,
} from "@editorjs/editorjs";

import ParagraphBlock, { type ParagraphConfig } from "./block-tool/paragraph/index";
import HeadingBlock, { type HeadingConfig } from "./block-tool/heading/index";
import QuoteBlock from "./block-tool/quote/index";
import DividerBlock from "./block-tool/divider/index";
import ListBlock from "./block-tool/list/index";

import AlignmentTune from "./block-tune/alignment/index";
import { BoldInlineTool } from "./inline-tool/bold/index";
import { ItalicInlineTool } from "./inline-tool/italic/index";
import { UnderlineInlineTool } from "./inline-tool/underline/index";
import { CodeInlineTool } from "./inline-tool/inline-code/index";
import { StrikethroughInlineTool } from "./inline-tool/strikethrough/index";
import { HighlighterInlineTool } from "./inline-tool/highlighter/index";
import { TextColorInlineTool } from "./inline-tool/text-color/index";

export const tools: EditorConfig["tools"] = {
  alignment: AlignmentTune,
  paragraph: {
    class: ParagraphBlock as unknown as BlockToolConstructable,
    inlineToolbar: [
      "bold",
      "italic",
      "underline",
      "inlineCode",
      "strikethrough",
      "textColor",
      "highlighter",
    ],
    config: {
      preserveBlank: true,
      placeholder: "Start writing your notes... Press tab or click + to add blocks",
    } as ToolConfig<ParagraphConfig>,
    tunes: ["alignment"],
  },
  heading: {
    class: HeadingBlock as unknown as BlockToolConstructable,
    inlineToolbar: ["italic", "underline", "strikethrough", "textColor", "highlighter"],
    config: { defaultLevel: 2 } as ToolConfig<HeadingConfig>,
    tunes: ["alignment"],
  },
  quote: {
    class: QuoteBlock as unknown as BlockToolConstructable,
    inlineToolbar: [
      "bold",
      "italic",
      "underline",
      "inlineCode",
      "strikethrough",
      "textColor",
      "highlighter",
    ],
    config: {
      quotePlaceholder: "Enter a quote",
      captionPlaceholder: "Quote's author",
    },
  },
  list: {
    class: ListBlock as unknown as BlockToolConstructable,
    inlineToolbar: ["bold", "italic", "underline", "inlineCode", "strikethrough", "textColor", "highlighter"],
  },
  divider: DividerBlock,
  bold: BoldInlineTool,
  italic: ItalicInlineTool,
  underline: UnderlineInlineTool,
  strikethrough: StrikethroughInlineTool,
  inlineCode: CodeInlineTool,
  textColor: TextColorInlineTool,
  highlighter: HighlighterInlineTool,
};


