import { TextStyleConfiguration } from '../base_component/text_style_configuration';
import { TextSpanDecoratorForAttribute, AppFlowyTextSpanOverlayBuilder } from '../../text_span/text_span_decorator';
import { defaultTextSpanDecoratorForAttribute, mobileTextSpanDecoratorForAttribute } from '../../text_span/default_text_span_decorator';

/**
 * The style of the editor.
 * 
 * You can customize the style of the editor by passing the EditorStyle to
 * the AppFlowyEditor.
 */
export class EditorStyle {
  // The padding of the editor
  public readonly padding: { top?: number; bottom?: number; left?: number; right?: number };
  
  // The max width of the editor
  public readonly maxWidth?: number;
  
  // The cursor color
  public readonly cursorColor: string;
  
  // The cursor width
  public readonly cursorWidth: number;
  
  // The drag handle color (only works on mobile)
  public readonly dragHandleColor: string;
  
  // The selection color
  public readonly selectionColor: string;
  
  // Customize the text style of the editor
  public readonly textStyleConfiguration: TextStyleConfiguration;
  
  // Customize the built-in or custom text span
  public readonly textSpanDecorator?: TextSpanDecoratorForAttribute;
  
  // Customize the text span overlay builder
  public readonly textSpanOverlayBuilder?: AppFlowyTextSpanOverlayBuilder;
  
  public readonly defaultTextDirection?: string;
  
  // The size of the magnifier (only works on mobile)
  public readonly magnifierSize: { width: number; height: number };
  
  // Mobile drag handler size (only works on mobile)
  public readonly mobileDragHandleBallSize: { width: number; height: number };
  
  // The extend of the mobile drag handle
  public readonly mobileDragHandleTopExtend?: number;
  public readonly mobileDragHandleLeftExtend?: number;
  public readonly mobileDragHandleWidthExtend?: number;
  public readonly mobileDragHandleHeightExtend?: number;
  
  // The auto-dismiss time of the collapsed handle (only works on Android)
  public readonly autoDismissCollapsedHandleDuration: number; // in milliseconds
  
  public readonly mobileDragHandleWidth: number;
  
  // Enable haptic feedback when updating selection by dragging (only works on Android)
  public readonly enableHapticFeedbackOnAndroid: boolean;
  
  public readonly textScaleFactor: number;

  constructor(options: {
    padding: { top?: number; bottom?: number; left?: number; right?: number };
    cursorColor: string;
    dragHandleColor: string;
    selectionColor: string;
    textStyleConfiguration: TextStyleConfiguration;
    textSpanDecorator?: TextSpanDecoratorForAttribute;
    textSpanOverlayBuilder?: AppFlowyTextSpanOverlayBuilder;
    magnifierSize?: { width: number; height: number };
    mobileDragHandleBallSize?: { width: number; height: number };
    mobileDragHandleWidth?: number;
    cursorWidth?: number;
    defaultTextDirection?: string;
    enableHapticFeedbackOnAndroid?: boolean;
    textScaleFactor?: number;
    maxWidth?: number;
    mobileDragHandleTopExtend?: number;
    mobileDragHandleWidthExtend?: number;
    mobileDragHandleLeftExtend?: number;
    mobileDragHandleHeightExtend?: number;
    autoDismissCollapsedHandleDuration?: number;
  }) {
    this.padding = options.padding;
    this.cursorColor = options.cursorColor;
    this.dragHandleColor = options.dragHandleColor;
    this.selectionColor = options.selectionColor;
    this.textStyleConfiguration = options.textStyleConfiguration;
    this.textSpanDecorator = options.textSpanDecorator;
    this.textSpanOverlayBuilder = options.textSpanOverlayBuilder;
    this.magnifierSize = options.magnifierSize ?? { width: 72, height: 48 };
    this.mobileDragHandleBallSize = options.mobileDragHandleBallSize ?? { width: 8, height: 8 };
    this.mobileDragHandleWidth = options.mobileDragHandleWidth ?? 2.0;
    this.cursorWidth = options.cursorWidth ?? 2.0;
    this.defaultTextDirection = options.defaultTextDirection;
    this.enableHapticFeedbackOnAndroid = options.enableHapticFeedbackOnAndroid ?? true;
    this.textScaleFactor = options.textScaleFactor ?? 1.0;
    this.maxWidth = options.maxWidth;
    this.mobileDragHandleTopExtend = options.mobileDragHandleTopExtend;
    this.mobileDragHandleWidthExtend = options.mobileDragHandleWidthExtend;
    this.mobileDragHandleLeftExtend = options.mobileDragHandleLeftExtend;
    this.mobileDragHandleHeightExtend = options.mobileDragHandleHeightExtend;
    this.autoDismissCollapsedHandleDuration = options.autoDismissCollapsedHandleDuration ?? 3000;
  }

  static desktop(options: {
    padding?: { top?: number; bottom?: number; left?: number; right?: number };
    cursorColor?: string;
    selectionColor?: string;
    textStyleConfiguration?: TextStyleConfiguration;
    textSpanDecorator?: TextSpanDecoratorForAttribute;
    textSpanOverlayBuilder?: AppFlowyTextSpanOverlayBuilder;
    defaultTextDirection?: string;
    cursorWidth?: number;
    textScaleFactor?: number;
    maxWidth?: number;
  } = {}): EditorStyle {
    return new EditorStyle({
      padding: options.padding ?? { left: 100, right: 100 },
      cursorColor: options.cursorColor ?? '#00BCF0',
      selectionColor: options.selectionColor ?? 'rgba(111, 201, 231, 0.21)',
      textStyleConfiguration: options.textStyleConfiguration ?? new TextStyleConfiguration({
        text: { fontSize: 16, color: '#000000' }
      }),
      textSpanDecorator: options.textSpanDecorator ?? defaultTextSpanDecoratorForAttribute,
      textSpanOverlayBuilder: options.textSpanOverlayBuilder,
      defaultTextDirection: options.defaultTextDirection,
      cursorWidth: options.cursorWidth ?? 2.0,
      textScaleFactor: options.textScaleFactor ?? 1.0,
      maxWidth: options.maxWidth,
      magnifierSize: { width: 0, height: 0 },
      mobileDragHandleBallSize: { width: 0, height: 0 },
      mobileDragHandleWidth: 0.0,
      enableHapticFeedbackOnAndroid: false,
      dragHandleColor: 'transparent',
      autoDismissCollapsedHandleDuration: 0,
    });
  }

  static mobile(options: {
    padding?: { top?: number; bottom?: number; left?: number; right?: number };
    cursorColor?: string;
    dragHandleColor?: string;
    selectionColor?: string;
    textStyleConfiguration?: TextStyleConfiguration;
    textSpanDecorator?: TextSpanDecoratorForAttribute;
    textSpanOverlayBuilder?: AppFlowyTextSpanOverlayBuilder;
    defaultTextDirection?: string;
    magnifierSize?: { width: number; height: number };
    mobileDragHandleBallSize?: { width: number; height: number };
    mobileDragHandleWidth?: number;
    cursorWidth?: number;
    enableHapticFeedbackOnAndroid?: boolean;
    textScaleFactor?: number;
    maxWidth?: number;
    mobileDragHandleTopExtend?: number;
    mobileDragHandleWidthExtend?: number;
    mobileDragHandleLeftExtend?: number;
    mobileDragHandleHeightExtend?: number;
    autoDismissCollapsedHandleDuration?: number;
  } = {}): EditorStyle {
    return new EditorStyle({
      padding: options.padding ?? { left: 20, right: 20 },
      cursorColor: options.cursorColor ?? '#00BCF0',
      dragHandleColor: options.dragHandleColor ?? '#00BCF0',
      selectionColor: options.selectionColor ?? 'rgba(111, 201, 231, 0.21)',
      textStyleConfiguration: options.textStyleConfiguration ?? new TextStyleConfiguration({
        text: { fontSize: 16, color: '#000000' }
      }),
      textSpanDecorator: options.textSpanDecorator ?? mobileTextSpanDecoratorForAttribute,
      textSpanOverlayBuilder: options.textSpanOverlayBuilder,
      defaultTextDirection: options.defaultTextDirection,
      magnifierSize: options.magnifierSize ?? { width: 72, height: 48 },
      mobileDragHandleBallSize: options.mobileDragHandleBallSize ?? { width: 8, height: 8 },
      mobileDragHandleWidth: options.mobileDragHandleWidth ?? 2.0,
      cursorWidth: options.cursorWidth ?? 2.0,
      enableHapticFeedbackOnAndroid: options.enableHapticFeedbackOnAndroid ?? true,
      textScaleFactor: options.textScaleFactor ?? 1.0,
      maxWidth: options.maxWidth,
      mobileDragHandleTopExtend: options.mobileDragHandleTopExtend,
      mobileDragHandleWidthExtend: options.mobileDragHandleWidthExtend,
      mobileDragHandleLeftExtend: options.mobileDragHandleLeftExtend,
      mobileDragHandleHeightExtend: options.mobileDragHandleHeightExtend,
      autoDismissCollapsedHandleDuration: options.autoDismissCollapsedHandleDuration ?? 3000,
    });
  }

  copyWith(options: Partial<{
    padding: { top?: number; bottom?: number; left?: number; right?: number };
    cursorColor: string;
    dragHandleColor: string;
    selectionColor: string;
    textStyleConfiguration: TextStyleConfiguration;
    textSpanDecorator: TextSpanDecoratorForAttribute;
    textSpanOverlayBuilder: AppFlowyTextSpanOverlayBuilder;
    defaultTextDirection: string;
    magnifierSize: { width: number; height: number };
    mobileDragHandleBallSize: { width: number; height: number };
    mobileDragHandleWidth: number;
    enableHapticFeedbackOnAndroid: boolean;
    cursorWidth: number;
    textScaleFactor: number;
    maxWidth: number;
    mobileDragHandleTopExtend: number;
    mobileDragHandleWidthExtend: number;
    mobileDragHandleLeftExtend: number;
    mobileDragHandleHeightExtend: number;
    autoDismissCollapsedHandleDuration: number;
  }>): EditorStyle {
    return new EditorStyle({
      padding: options.padding ?? this.padding,
      cursorColor: options.cursorColor ?? this.cursorColor,
      dragHandleColor: options.dragHandleColor ?? this.dragHandleColor,
      selectionColor: options.selectionColor ?? this.selectionColor,
      textStyleConfiguration: options.textStyleConfiguration ?? this.textStyleConfiguration,
      textSpanDecorator: options.textSpanDecorator ?? this.textSpanDecorator,
      textSpanOverlayBuilder: options.textSpanOverlayBuilder ?? this.textSpanOverlayBuilder,
      defaultTextDirection: options.defaultTextDirection ?? this.defaultTextDirection,
      magnifierSize: options.magnifierSize ?? this.magnifierSize,
      mobileDragHandleBallSize: options.mobileDragHandleBallSize ?? this.mobileDragHandleBallSize,
      mobileDragHandleWidth: options.mobileDragHandleWidth ?? this.mobileDragHandleWidth,
      enableHapticFeedbackOnAndroid: options.enableHapticFeedbackOnAndroid ?? this.enableHapticFeedbackOnAndroid,
      cursorWidth: options.cursorWidth ?? this.cursorWidth,
      textScaleFactor: options.textScaleFactor ?? this.textScaleFactor,
      maxWidth: options.maxWidth ?? this.maxWidth,
      mobileDragHandleTopExtend: options.mobileDragHandleTopExtend ?? this.mobileDragHandleTopExtend,
      mobileDragHandleWidthExtend: options.mobileDragHandleWidthExtend ?? this.mobileDragHandleWidthExtend,
      mobileDragHandleLeftExtend: options.mobileDragHandleLeftExtend ?? this.mobileDragHandleLeftExtend,
      mobileDragHandleHeightExtend: options.mobileDragHandleHeightExtend ?? this.mobileDragHandleHeightExtend,
      autoDismissCollapsedHandleDuration: options.autoDismissCollapsedHandleDuration ?? this.autoDismissCollapsedHandleDuration,
    });
  }
}