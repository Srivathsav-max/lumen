import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export type PageView = 
  | 'dashboard' 
  | 'graph' 
  | 'analytics' 
  | 'assistant' 
  | 'course' 
  | 'group' 
  | 'profile' 
  | 'settings';

export interface NavIconProps {
  icon: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

export interface StatCardProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  color: string;
}

export interface CourseCardProps {
  icon: ReactNode;
  title: string;
  progress: number;
  tag: string;
  completion: string;
  time: string;
}

export interface TaskItemProps {
  icon: ReactNode;
  title: string;
  dueDate: string;
  urgent?: boolean;
}
