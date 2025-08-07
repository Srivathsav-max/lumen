import React, { ReactNode } from 'react';
import { Node } from '../../types';

// Type definition for BlockComponentWrapper
export type BlockComponentWrapper = (
  context: any, // React context equivalent
  options: {
    node: Node;
    child: ReactNode;
  }
) => ReactNode;

// BlockComponentContext interface
export interface BlockComponentContext {
  buildContext: any; // React context equivalent
  node: Node;
  
  /// the header and the footer only work for root node.
  header?: ReactNode;
  footer?: ReactNode;
  
  /// Wrap the block component with a widget.
  wrapper?: BlockComponentWrapper;
}

// BlockComponentContext class implementation
export class BlockComponentContextImpl implements BlockComponentContext {
  constructor(
    public buildContext: any,
    public node: Node,
    options?: {
      header?: ReactNode;
      footer?: ReactNode;
      wrapper?: BlockComponentWrapper;
    }
  ) {
    this.header = options?.header;
    this.footer = options?.footer;
    this.wrapper = options?.wrapper;
  }

  public readonly header?: ReactNode;
  public readonly footer?: ReactNode;
  public readonly wrapper?: BlockComponentWrapper;
}