"use client";

import React, { useState } from 'react';
import { 
  Brain, 
  Code, 
  Network,
  BrainCircuit,
  BookOpen,
  LineChart,
  Users,
  User,
  Settings,
  Bell,
  ChevronDown,
  Search,
  Flame,
  Clock,
  Lightbulb,
  Trophy
} from 'lucide-react';

import { PageView } from './types';
import { NavIcon, StatCard, CourseCard } from './ui-components';
import { Pages } from './pages';

export const FullDashboard = () => {
  const [activeLearningTab, setActiveLearningTab] = useState('all');
  const [activeView, setActiveView] = useState<PageView>('dashboard');

  const handleSectionClick = (view: PageView) => {
    setActiveView(view);
  };

  const renderContent = () => {
    const PageComponent = Pages[activeView]?.component;
    
    if (PageComponent && activeView !== 'dashboard') {
      return <PageComponent />;
    }

    // Default dashboard content
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, Alex!</h1>
          <p className="text-gray-600">Continue your learning journey</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard 
            icon={<Flame className="w-5 h-5 text-orange-500" />} 
            title="5-Day Streak" 
            subtitle="Keep it up!" 
            color="bg-orange-50" 
          />
          <StatCard 
            icon={<Clock className="w-5 h-5 text-blue-500" />} 
            title="23 Hours" 
            subtitle="Learning time" 
            color="bg-blue-50" 
          />
          <StatCard 
            icon={<Lightbulb className="w-5 h-5 text-yellow-500" />} 
            title="42 Concepts" 
            subtitle="Mastered" 
            color="bg-yellow-50" 
          />
          <StatCard 
            icon={<Trophy className="w-5 h-5 text-purple-500" />} 
            title="Gold Tier" 
            subtitle="Top 5%" 
            color="bg-purple-50" 
          />
        </div>

        {/* Course Cards */}
        <div className="grid grid-cols-1 gap-4">
          <CourseCard 
            icon={<Code className="w-5 h-5 text-blue-500" />}
            title="Advanced Machine Learning"
            progress={68}
            tag="Advanced"
            completion="68% Complete"
            time="Last accessed 2 hours ago"
          />
          <CourseCard 
            icon={<Network className="w-5 h-5 text-purple-500" />}
            title="Graph Neural Networks"
            progress={42}
            tag="Intermediate"
            completion="42% Complete"
            time="Last accessed yesterday"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <div className="mb-8">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white">
            <Brain className="w-6 h-6" />
          </div>
        </div>

        <NavIcon 
          icon={<Brain className="w-5 h-5" />} 
          active={activeView === 'dashboard'} 
          onClick={() => handleSectionClick('dashboard')}
        />
        <NavIcon 
          icon={<BookOpen className="w-5 h-5" />} 
          active={activeView === 'course'} 
          onClick={() => handleSectionClick('course')}
        />
        <NavIcon 
          icon={<Network className="w-5 h-5" />} 
          active={activeView === 'graph'} 
          onClick={() => handleSectionClick('graph')}
        />
        <NavIcon 
          icon={<BrainCircuit className="w-5 h-5" />} 
          active={activeView === 'assistant'} 
          onClick={() => handleSectionClick('assistant')}
        />
        <NavIcon 
          icon={<LineChart className="w-5 h-5" />} 
          active={activeView === 'analytics'} 
          onClick={() => handleSectionClick('analytics')}
        />
        <NavIcon 
          icon={<Users className="w-5 h-5" />} 
          active={activeView === 'group'} 
          onClick={() => handleSectionClick('group')}
        />
        
        <div className="mt-auto">
          <NavIcon 
            icon={<User className="w-5 h-5" />} 
            active={activeView === 'profile'} 
            onClick={() => handleSectionClick('profile')}
          />
          <NavIcon 
            icon={<Settings className="w-5 h-5" />} 
            active={activeView === 'settings'} 
            onClick={() => handleSectionClick('settings')}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            Moxium Learning
          </div>
          
          <div className="w-1/3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search courses, concepts..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>
            
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                AJ
              </div>
              <span className="text-sm font-medium">Alex Johnson</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        {renderContent()}
      </div>
    </div>
  );
};
