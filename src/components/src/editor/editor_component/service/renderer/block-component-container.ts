import React, { ReactNode } from 'react';
import {
  Node,
  BlockComponentConfiguration,
  AppFlowyEditorLog,
} from '../../appflowy-editor';

export interface BlockComponentContainerProps {
  configuration: BlockComponentConfiguration;
  node: Node;
  builder: (context?: any) => ReactNode;
}

/**
 * BlockComponentContainer is a wrapper of block component
 *
 * 1. used to update the child widget when node is changed
 * ~~2. used to show block component actions~~
 * 3. used to add the layer link to the child widget
 */
export const BlockComponentContainer: React.FC<BlockComponentContainerProps> = ({
  configuration,
  node,
  builder,
}) => {
  // Use React's state management for node changes
  const [nodeState, setNodeState] = React.useState(node);

  // Listen for node changes
  React.useEffect(() => {
    const handleNodeChange = () => {
      AppFlowyEditorLog.editor.debug(`node is rebuilding...: type: ${node.type}`);
      setNodeState({ ...node });
    };

    // Add listener for node changes
    node.addListener?.(handleNodeChange);

    return () => {
      // Remove listener on cleanup
      node.removeListener?.(handleNodeChange);
    };
  }, [node]);

  const child = (
    <div
      data-layer-link={node.layerLink}
      data-node-type={node.type}
      data-node-id={node.id}
    >
      {builder()}
    </div>
  );

  return child;
};