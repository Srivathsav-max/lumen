import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Node, EditorState, Position, Selection, TextInsert, Attributes } from '@/notes-core';
import { SelectableMixin } from '../base_component/mixins';
import { BlockSelectionContainer } from '@/notes-editor/block_component/base_component/selection/block_selection_container';
import { AppFlowyRichTextKeys } from './appflowy_rich_text_keys';
import { TextStyleConfiguration } from '@/notes-editor/block_component/base_component/text_style_configuration';

export type TextSpanDecoratorForAttribute = (
  context: React.Context<any>,
  node: Node,
  index: number,
  text: TextInsert,
  before: React.ReactNode,
  after: React.ReactNode
) => React.ReactNode;

export type AppFlowyTextSpanDecorator = (textSpan: React.ReactNode) => React.ReactNode;

export type AppFlowyAutoCompleteTextProvider = (
  context: React.Context<any>,
  node: Node,
  textSpan?: React.ReactNode
) => string | null;

export type AppFlowyTextSpanOverlayBuilder = (
  context: React.Context<any>,
  node: Node,
  delegate: SelectableMixin
) => React.ReactNode[];

export interface AppFlowyRichTextProps {
  node: Node;
  editorState: EditorState;
  delegate: SelectableMixin;
  cursorHeight?: number;
  cursorWidth?: number;
  lineHeight?: number;
  textSpanDecorator?: AppFlowyTextSpanDecorator;
  placeholderText?: string;
  placeholderTextSpanDecorator?: AppFlowyTextSpanDecorator;
  textDirection?: 'ltr' | 'rtl';
  textSpanDecoratorForCustomAttributes?: TextSpanDecoratorForAttribute;
  textSpanOverlayBuilder?: AppFlowyTextSpanOverlayBuilder;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  cursorColor?: string;
  selectionColor?: string;
  autoCompleteTextProvider?: AppFlowyAutoCompleteTextProvider;
}

export const AppFlowyRichText: React.FC<AppFlowyRichTextProps> = ({
  node,
  editorState,
  delegate,
  cursorHeight,
  cursorWidth = 2.0,
  lineHeight,
  textSpanDecorator,
  placeholderText = ' ',
  placeholderTextSpanDecorator,
  textDirection = 'ltr',
  textSpanDecoratorForCustomAttributes,
  textSpanOverlayBuilder,
  textAlign = 'left',
  cursorColor = '#000000',
  selectionColor = 'rgba(111, 201, 231, 0.2)',
  autoCompleteTextProvider,
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const placeholderTextRef = useRef<HTMLDivElement>(null);
  const [contextEnabled, setContextEnabled] = useState(false);

  const textStyleConfiguration = useMemo(() => 
    editorState.editorStyle.textStyleConfiguration, [editorState]);

  const enableAutoComplete = useMemo(() => 
    editorState.enableAutoComplete && 
    (autoCompleteTextProvider || editorState.autoCompleteTextProvider) != null,
    [editorState, autoCompleteTextProvider]);

  const finalTextSpanDecoratorForAttribute = useMemo(() =>
    textSpanDecoratorForCustomAttributes || 
    editorState.editorStyle.textSpanDecorator,
    [textSpanDecoratorForCustomAttributes, editorState]);

  const finalAutoCompleteTextProvider = useMemo(() =>
    autoCompleteTextProvider || editorState.autoCompleteTextProvider,
    [autoCompleteTextProvider, editorState]);

  const finalTextSpanOverlayBuilder = useMemo(() =>
    textSpanOverlayBuilder || editorState.editorStyle.textSpanOverlayBuilder,
    [textSpanOverlayBuilder, editorState]);

  useEffect(() => {
    const confirmContext = () => {
      if (textRef.current) {
        setContextEnabled(true);
      } else {
        requestAnimationFrame(confirmContext);
      }
    };
    confirmContext();
  }, []);

  const getPlaceholderTextSpan = useCallback(() => {
    const style: React.CSSProperties = {
      ...textStyleConfiguration.text,
      lineHeight: textStyleConfiguration.lineHeight,
    };

    let textSpan = (
      <span style={style}>
        {placeholderText}
      </span>
    );

    if (placeholderTextSpanDecorator) {
      textSpan = placeholderTextSpanDecorator(textSpan) as React.ReactElement;
    }

    return adjustTextSpan(textSpan);
  }, [placeholderText, placeholderTextSpanDecorator, textStyleConfiguration]);

  const adjustTextSpan = useCallback((textSpan: React.ReactNode): React.ReactNode => {
    // Workaround for text span height calculation
    return textSpan;
  }, []);

  const getTextSpan = useCallback((textInserts: TextInsert[]): React.ReactNode => {
    let offset = 0;
    const textSpans: React.ReactNode[] = [];

    for (const textInsert of textInserts) {
      let textStyle: React.CSSProperties = {
        ...textStyleConfiguration.text,
        lineHeight: textStyleConfiguration.lineHeight,
      };

      const attributes = textInsert.attributes;
      if (attributes) {
        if (attributes.bold) {
          textStyle = { ...textStyle, ...textStyleConfiguration.bold };
        }
        if (attributes.italic) {
          textStyle = { ...textStyle, ...textStyleConfiguration.italic };
        }
        if (attributes.underline) {
          textStyle = { ...textStyle, ...textStyleConfiguration.underline };
        }
        if (attributes.strikethrough) {
          textStyle = { ...textStyle, ...textStyleConfiguration.strikethrough };
        }
        if (attributes.href) {
          textStyle = { ...textStyle, ...textStyleConfiguration.href };
        }
        if (attributes.code) {
          textStyle = { ...textStyle, ...textStyleConfiguration.code };
        }
        if (attributes.backgroundColor) {
          textStyle.backgroundColor = attributes.backgroundColor;
        }
        if (attributes.findBackgroundColor) {
          textStyle.backgroundColor = attributes.findBackgroundColor;
        }
        if (attributes.color) {
          textStyle.color = attributes.color;
        }
        if (attributes.fontFamily) {
          textStyle.fontFamily = attributes.fontFamily;
        }
        if (attributes.fontSize) {
          textStyle.fontSize = attributes.fontSize;
        }
        if (attributes.autoComplete) {
          textStyle = { ...textStyle, ...textStyleConfiguration.autoComplete };
        }
        if (attributes.transparent) {
          textStyle.color = 'transparent';
        }
      }

      const textSpan = (
        <span key={offset} style={textStyle}>
          {textInsert.text}
        </span>
      );

      textSpans.push(
        finalTextSpanDecoratorForAttribute
          ? finalTextSpanDecoratorForAttribute(
              React.createContext({}),
              node,
              offset,
              textInsert,
              textSpan,
              textSpanDecorator?.(textSpan) || textSpan
            )
          : textSpan
      );

      offset += textInsert.length;
    }

    return <>{textSpans}</>;
  }, [node, textStyleConfiguration, finalTextSpanDecoratorForAttribute, textSpanDecorator]);

  const buildPlaceholderText = useCallback(() => {
    let textSpan = getPlaceholderTextSpan();
    
    const delta = node.delta;
    if (delta && delta.length > 0) {
      // Make placeholder transparent when there's content
      const transparentStyle: React.CSSProperties = { color: 'transparent' };
      textSpan = <span style={transparentStyle}>{textSpan}</span>;
    }

    return (
      <div
        ref={placeholderTextRef}
        style={{
          direction: textDirection,
          textAlign: textAlign,
          fontSize: `${editorState.editorStyle.textScaleFactor}em`,
        }}
      >
        {textSpan}
      </div>
    );
  }, [getPlaceholderTextSpan, node, textDirection, textAlign, editorState]);

  const buildRichText = useCallback(() => {
    const textInserts = node.delta?.filter(op => op.insert && typeof op.insert === 'string')
      .map(op => new TextInsert(op.insert as string, op.attributes)) || [];
    
    let textSpan = getTextSpan(textInserts);
    
    if (textSpanDecorator) {
      textSpan = textSpanDecorator(textSpan);
    }
    
    textSpan = adjustTextSpan(textSpan);

    return (
      <div
        ref={textRef}
        style={{
          direction: textDirection,
          textAlign: textAlign,
          fontSize: `${editorState.editorStyle.textScaleFactor}em`,
        }}
      >
        {textSpan}
      </div>
    );
  }, [node, getTextSpan, textSpanDecorator, adjustTextSpan, textDirection, textAlign, editorState]);

  const buildRichTextOverlay = useCallback(() => {
    if (!contextEnabled || !textRef.current) return [];
    
    return finalTextSpanOverlayBuilder?.(
      React.createContext({}),
      node,
      delegate
    ) || [];
  }, [contextEnabled, finalTextSpanOverlayBuilder, node, delegate]);

  const buildAutoCompleteRichText = useCallback(() => {
    const textInserts = node.delta?.filter(op => op.insert && typeof op.insert === 'string')
      .map(op => new TextInsert(op.insert as string, op.attributes)) || [];
    
    const autoCompleteText = finalAutoCompleteTextProvider?.(
      React.createContext({}),
      node,
      getTextSpan(textInserts)
    );

    if (!autoCompleteText) {
      return null;
    }

    const allTextInserts = [
      ...textInserts.map(e => new TextInsert(
        e.text,
        { [AppFlowyRichTextKeys.transparent]: true }
      )),
      new TextInsert(
        autoCompleteText,
        { [AppFlowyRichTextKeys.autoComplete]: true }
      ),
    ];

    const textSpan = getTextSpan(allTextInserts);

    return (
      <div
        style={{
          direction: textDirection,
          textAlign: textAlign,
          fontSize: `${editorState.editorStyle.textScaleFactor}em`,
        }}
      >
        {textSpan}
      </div>
    );
  }, [node, finalAutoCompleteTextProvider, getTextSpan, textDirection, textAlign, editorState]);

  const autoCompleteWidget = enableAutoComplete ? buildAutoCompleteRichText() : null;

  return (
    <BlockSelectionContainer
      delegate={delegate}
      listenable={editorState.selectionNotifier}
      remoteSelection={editorState.remoteSelections}
      node={node}
      cursorColor={cursorColor}
      selectionColor={selectionColor}
    >
      <div style={{ cursor: 'text', position: 'relative' }}>
        {autoCompleteWidget && (
          <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
            {autoCompleteWidget}
          </div>
        )}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {buildPlaceholderText()}
          {buildRichText()}
          {buildRichTextOverlay()}
        </div>
      </div>
    </BlockSelectionContainer>
  );
};

// Extension for Attributes
export const AppFlowyRichTextAttributesExtension = {
  getBold: (attributes: Attributes): boolean => 
    attributes[AppFlowyRichTextKeys.bold] === true,

  getItalic: (attributes: Attributes): boolean => 
    attributes[AppFlowyRichTextKeys.italic] === true,

  getUnderline: (attributes: Attributes): boolean => 
    attributes[AppFlowyRichTextKeys.underline] === true,

  getCode: (attributes: Attributes): boolean => 
    attributes[AppFlowyRichTextKeys.code] === true,

  getStrikethrough: (attributes: Attributes): boolean => 
    attributes[AppFlowyRichTextKeys.strikethrough] === true,

  getColor: (attributes: Attributes): string | null => {
    const textColor = attributes[AppFlowyRichTextKeys.textColor] as string;
    return textColor || null;
  },

  getBackgroundColor: (attributes: Attributes): string | null => {
    const highlightColor = attributes[AppFlowyRichTextKeys.backgroundColor] as string;
    return highlightColor || null;
  },

  getFindBackgroundColor: (attributes: Attributes): string | null => {
    const findBackgroundColor = attributes[AppFlowyRichTextKeys.findBackgroundColor] as string;
    return findBackgroundColor || null;
  },

  getHref: (attributes: Attributes): string | null => {
    const href = attributes[AppFlowyRichTextKeys.href];
    return typeof href === 'string' ? href : null;
  },

  getFontFamily: (attributes: Attributes): string | null => {
    const fontFamily = attributes[AppFlowyRichTextKeys.fontFamily];
    return typeof fontFamily === 'string' ? fontFamily : null;
  },

  getFontSize: (attributes: Attributes): number | null => {
    const fontSize = attributes[AppFlowyRichTextKeys.fontSize];
    return typeof fontSize === 'number' ? fontSize : null;
  },

  getAutoComplete: (attributes: Attributes): boolean => 
    attributes[AppFlowyRichTextKeys.autoComplete] === true,

  getTransparent: (attributes: Attributes): boolean => 
    attributes[AppFlowyRichTextKeys.transparent] === true,
};