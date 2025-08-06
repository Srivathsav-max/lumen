import React, { ReactNode } from 'react';
import { Node, Position, BlockComponentConfiguration } from '../../types';
import { BlockComponentContext, BlockComponentWrapper } from './block-component-context';
import { BlockComponentContainer } from './block-component-container';

export const errorBlockComponentBuilderKey = 'errorBlockComponentBuilderKey';

// this value is used to force show the block action.
// it is only for test now.
export let forceShowBlockAction = false;

export type BlockActionBuilder = (
  blockComponentContext: BlockComponentContext,
  state: BlockComponentActionState
) => ReactNode;

export type BlockActionTrailingBuilder = (
  blockComponentContext: BlockComponentContext,
  state: BlockComponentActionState
) => ReactNode;

export type BlockComponentValidate = (node: Node) => boolean;

export abstract class BlockComponentActionState {
  abstract set alwaysShowActions(alwaysShowActions: boolean);
}

// BlockComponentWidget interface (equivalent to Flutter widget)
export interface BlockComponentWidget {
  render(): ReactNode;
}

/// BlockComponentBuilder is used to build a BlockComponentWidget.
export abstract class BlockComponentBuilder implements BlockComponentSelectable {
  public configuration: BlockComponentConfiguration;
  
  constructor(options?: { configuration?: BlockComponentConfiguration }) {
    this.configuration = options?.configuration || new BlockComponentConfiguration();
  }

  /// validate the node.
  ///
  /// return true if the node is valid.
  /// return false if the node is invalid,
  ///   and the node will be displayed as a PlaceHolder widget.
  public validate: BlockComponentValidate = (_) => true;

  public abstract build(blockComponentContext: BlockComponentContext): BlockComponentWidget;

  public showActions: (node: Node) => boolean = (_) => false;

  public actionBuilder: BlockActionBuilder = (_, __) => null;

  public actionTrailingBuilder: BlockActionTrailingBuilder = (_, __) => null;

  // BlockComponentSelectable implementation
  /// the start position of the block component.
  ///
  /// For the text block component, the start position is always 0.
  public start(node: Node): Position {
    return new Position(node.path, 0);
  }

  /// the end position of the block component.
  ///
  /// For the text block component, the end position is always the length of the text.
  public end(node: Node): Position {
    return new Position(
      node.path,
      node.delta?.length ?? 0
    );
  }
}

export interface BlockComponentSelectable {
  /// the start position of the block component.
  start(node: Node): Position;
  
  /// the end position of the block component.
  end(node: Node): Position;
}

export abstract class BlockComponentRendererService {
  /// Register render plugin with specified [type].
  ///
  /// [type] should be [Node].type and should not be empty.
  ///
  /// e.g. 'paragraph', 'image', or 'bulleted_list'
  ///
  abstract register(type: string, builder: BlockComponentBuilder): void;

  /// Register render plugins with specified [type]s.
  registerAll(builders: Map<string, BlockComponentBuilder>): void {
    builders.forEach((builder, type) => this.register(type, builder));
  }

  /// UnRegister plugin with specified [type].
  abstract unRegister(type: string): void;

  /// Returns a [BlockComponentBuilder], if one has been registered for [type]
  /// or null otherwise.
  abstract blockComponentBuilder(type: string): BlockComponentBuilder | null;

  blockComponentSelectable(type: string): BlockComponentSelectable | null {
    const builder = this.blockComponentBuilder(type);
    if (builder && 'start' in builder && 'end' in builder) {
      return builder as BlockComponentSelectable;
    }
    return null;
  }

  /// Build a widget for the specified [node].
  ///
  /// the widget is embedded in a [BlockComponentContainer] widget.
  ///
  /// the header and the footer only works for the root node.
  abstract build(
    buildContext: any,
    node: Node,
    options?: {
      header?: ReactNode;
      footer?: ReactNode;
      wrapper?: BlockComponentWrapper;
    }
  ): ReactNode;

  buildList(
    buildContext: any,
    nodes: Iterable<Node>
  ): ReactNode[] {
    return Array.from(nodes).map((node) => this.build(buildContext, node));
  }
}

export class BlockComponentRenderer extends BlockComponentRendererService {
  private readonly _builders: Map<string, BlockComponentBuilder> = new Map();

  constructor(options: { builders: Map<string, BlockComponentBuilder> }) {
    super();
    this.registerAll(options.builders);
  }

  build(
    buildContext: any,
    node: Node,
    options?: {
      header?: ReactNode;
      footer?: ReactNode;
      wrapper?: BlockComponentWrapper;
    }
  ): ReactNode {
    const blockComponentContext: BlockComponentContext = {
      buildContext,
      node,
      header: options?.header,
      footer: options?.footer,
      wrapper: options?.wrapper,
    };
    
    const errorBuilder = this._builders.get(errorBlockComponentBuilderKey);
    const builder = this.blockComponentBuilder(node.type);
    
    if (!builder || !builder.validate(node)) {
      if (errorBuilder) {
        return React.createElement(BlockComponentContainer, {
          node,
          configuration: errorBuilder.configuration,
          builder: (_: any) => errorBuilder.build(blockComponentContext).render(),
        });
      } else {
        return this._buildPlaceHolderWidget(blockComponentContext);
      }
    }

    return React.createElement(BlockComponentContainer, {
      node,
      configuration: builder.configuration,
      builder: (_: any) => builder.build(blockComponentContext).render(),
    });
  }

  blockComponentBuilder(type: string): BlockComponentBuilder | null {
    return this._builders.get(type) || null;
  }

  register(type: string, builder: BlockComponentBuilder): void {
    console.info(`register block component builder for type(${type})`);
    if (!type) {
      throw new Error('type should not be empty');
    }
    if (this._builders.has(type)) {
      throw new Error(`type(${type}) has been registered`);
    }
    this._builders.set(type, builder);
  }

  unRegister(type: string): void {
    this._builders.delete(type);
  }

  private _buildPlaceHolderWidget(blockComponentContext: BlockComponentContext): ReactNode {
    return React.createElement('div', {
      key: blockComponentContext.node.key,
      style: {
        height: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    }, 'placeholder');
  }
}