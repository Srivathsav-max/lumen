import React, { ReactNode } from 'react';
import { Node } from '../../types';

// BlockComponentActionContainer Props
interface BlockComponentActionContainerProps {
  node: Node;
  showActions: boolean;
  actionBuilder: () => ReactNode;
}

// BlockComponentActionContainer Component
export const BlockComponentActionContainer: React.FC<BlockComponentActionContainerProps> = ({
  node,
  showActions,
  actionBuilder,
}) => {
  return (
    <div
      style={{
        // Set the color to transparent to make the mouse events work
        backgroundColor: 'transparent',
      }}
    >
      <div
        style={{
          visibility: showActions ? 'visible' : 'hidden',
          // Maintain size, animation, and state
          position: 'relative',
        }}
      >
        {actionBuilder()}
      </div>
    </div>
  );
};

// BlockComponentActionList Props
interface BlockComponentActionListProps {
  onTapAdd: () => void;
  onTapOption: () => void;
}

// BlockComponentActionList Component
export const BlockComponentActionList: React.FC<BlockComponentActionListProps> = ({
  onTapAdd,
  onTapOption,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        minWidth: 'min-content',
      }}
    >
      <BlockComponentActionButton
        icon={<AddIcon size={18} />}
        onTap={onTapAdd}
      />
      <div style={{ width: 5 }} />
      <BlockComponentActionButton
        icon={<AppsIcon size={18} />}
        onTap={onTapOption}
      />
    </div>
  );
};

// BlockComponentActionButton Props
interface BlockComponentActionButtonProps {
  icon: ReactNode;
  onTap: () => void;
}

// BlockComponentActionButton Component
export const BlockComponentActionButton: React.FC<BlockComponentActionButtonProps> = ({
  icon,
  onTap,
}) => {
  const handleMouseDown = () => {};
  const handleMouseUp = () => {};

  return (
    <div
      style={{
        cursor: 'grab',
      }}
      onClick={onTap}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {icon}
    </div>
  );
};

// Icon Components (placeholder implementations)
interface IconProps {
  size?: number;
}

const AddIcon: React.FC<IconProps> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
  </svg>
);

const AppsIcon: React.FC<IconProps> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" />
  </svg>
);