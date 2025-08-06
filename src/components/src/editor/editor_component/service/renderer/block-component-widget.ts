import React, { ReactNode, useContext, useEffect, useState, useRef } from 'react';
import { Node, BlockComponentConfiguration, EditorState, TextDirection } from '../../types';
import { BlockActionBuilder, BlockActionTrailingBuilder } from './block-component-service';

// BlockComponentWidget interface (equivalent to mixin)
export interface BlockComponentWidget {
  node: Node;
  configuration: BlockComponentConfiguration;
  actionBuilder?: BlockActionBuilder;
  actionTrailingBuilder?: BlockActionTrailingBuilder;
  showActions: boolean;
}

// BlockComponentStatelessWidget Props
export interface BlockComponentStatelessWidgetProps extends BlockComponentWidget {
  children?: ReactNode;
}

// BlockComponentStatelessWidget Component
export const BlockComponentStatelessWidget: React.FC<BlockComponentStatelessWidgetProps> = ({
  node,
  configuration,
  showActions = false,
  actionBuilder,
  actionTrailingBuilder,
  children,
}) => {
  // This is a base component that should be extended
  throw new Error('UnimplementedError: This component should be extended');
};

// BlockComponentStatefulWidget Props
export interface BlockComponentStatefulWidgetProps extends BlockComponentWidget {
  children?: ReactNode;
}

// BlockComponentStatefulWidget Component
export const BlockComponentStatefulWidget: React.FC<BlockComponentStatefulWidgetProps> = ({
  node,
  configuration,
  showActions = false,
  actionBuilder,
  actionTrailingBuilder,
  children,
}) => {
  // This is a base component that should be extended
  throw new Error('UnimplementedError: This component should be extended');
};

// EditorState Context (placeholder)
const EditorStateContext = React.createContext<EditorState | null>(null);

// BlockComponentBackgroundColorMixin interface
export interface BlockComponentBackgroundColorMixin {
  backgroundColor: string;
}

// BlockComponentTextDirectionMixin interface
export interface BlockComponentTextDirectionMixin {
  lastDirection: TextDirection;
}

// NestedBlockComponentStatefulWidget Props
export interface NestedBlockComponentStatefulWidgetProps {
  node: Node;
  configuration: BlockComponentConfiguration;
  children?: ReactNode;
}

// Custom hook equivalent to NestedBlockComponentStatefulWidgetMixin
export const useNestedBlockComponent = (
  node: Node,
  configuration: BlockComponentConfiguration
) => {
  const editorState = useContext(EditorStateContext);
  const [cachedLeft, setCachedLeft] = useState<number | null>(null);
  const [backgroundColor] = useState<string>('transparent'); // Default background color
  
  if (!editorState) {
    throw new Error('EditorState context not found');
  }

  // Calculate indent padding
  const getIndentPadding = (): any => {
    let direction: TextDirection = TextDirection.ltr; // Default direction
    
    if (node.children && node.children.length > 0) {
      const firstChild = node.children[0];
      
      // Check if first child has text direction mixin
      if (firstChild.key && 'lastDirection' in firstChild.key) {
        const currentState = firstChild.key as BlockComponentTextDirectionMixin;
        const lastDirection = currentState.lastDirection;
        
        direction = calculateNodeDirection({
          node: firstChild,
          layoutDirection: direction,
          defaultTextDirection: editorState.editorStyle?.defaultTextDirection || TextDirection.ltr,
          lastDirection,
        });
      }
    }
    
    return configuration.indentPadding ? configuration.indentPadding(node, direction) : { padding: 0 };
  };

  // Effect equivalent to initState and addPostFrameCallback
  useEffect(() => {
    const updateCachedLeft = () => {
      const left = node.selectable?.getBlockRect?.({ shiftWithBaseOffset: true })?.left;
      if (cachedLeft !== left) {
        setCachedLeft(left || null);
      }
    };

    // Use requestAnimationFrame as equivalent to addPostFrameCallback
    requestAnimationFrame(updateCachedLeft);
  }, [node, cachedLeft]);

  const buildComponentWithChildren = (
    buildComponent: (options: { withBackgroundColor: boolean }) => ReactNode
  ): ReactNode => {
    const indentPadding = getIndentPadding();
    
    return (
      <div style={{ position: 'relative' }}>
        {/* Background layer */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: cachedLeft || 0,
            backgroundColor,
          }}
        />
        
        {/* NestedListWidget equivalent */}
        <div style={indentPadding}>
          {buildComponent({ withBackgroundColor: false })}
          {editorState.renderer?.buildList?.(null, node.children || [])}
        </div>
      </div>
    );
  };

  const build = (
    buildComponent: (options: { withBackgroundColor: boolean }) => ReactNode
  ): ReactNode => {
    return (!node.children || node.children.length === 0)
      ? buildComponent({ withBackgroundColor: true })
      : buildComponentWithChildren(buildComponent);
  };

  return {
    editorState,
    cachedLeft,
    backgroundColor,
    getIndentPadding,
    buildComponentWithChildren,
    build,
  };
};

// Helper function to calculate node direction
const calculateNodeDirection = (options: {
  node: Node;
  layoutDirection: TextDirection;
  defaultTextDirection: TextDirection;
  lastDirection: TextDirection;
}): TextDirection => {
  // Simplified implementation - in a real scenario, this would be more complex
  return options.defaultTextDirection;
};

// NestedBlockComponentStatefulWidget Component
export const NestedBlockComponentStatefulWidget: React.FC<NestedBlockComponentStatefulWidgetProps> = ({
  node,
  configuration,
  children,
}) => {
  const {
    build,
  } = useNestedBlockComponent(node, configuration);

  const buildComponent = ({ withBackgroundColor }: { withBackgroundColor: boolean }): ReactNode => {
    // This should be implemented by the specific component
    return children;
  };

  return <>{build(buildComponent)}</>;
};