import { ReactNode } from 'react';
import { CourseDetailPage } from './course-detail';
import { StudyGroupPage } from './study-group';
import { ProfilePage } from './profile';
import { SettingsPage } from './settings';
import { AIAssistant } from '../ai-assistant';
import { LearningAnalytics } from '../analytics';
import { KnowledgeGraph } from '../knowledge-graph';

export type PageComponent = {
  title: string;
  component: React.ComponentType;
  path: string;
};

export const Pages = {
  dashboard: { title: 'Dashboard', component: null, path: '/' },
  course: { title: 'Course', component: CourseDetailPage, path: '/course' },
  graph: { title: 'Knowledge Graph', component: KnowledgeGraph, path: '/graph' },
  analytics: { title: 'Analytics', component: LearningAnalytics, path: '/analytics' },
  assistant: { title: 'AI Assistant', component: AIAssistant, path: '/assistant' },
  group: { title: 'Study Group', component: StudyGroupPage, path: '/group' },
  profile: { title: 'Profile', component: ProfilePage, path: '/profile' },
  settings: { title: 'Settings', component: SettingsPage, path: '/settings' }
};

export {
  CourseDetailPage,
  StudyGroupPage,
  ProfilePage,
  SettingsPage,
  AIAssistant,
  LearningAnalytics,
  KnowledgeGraph
};
