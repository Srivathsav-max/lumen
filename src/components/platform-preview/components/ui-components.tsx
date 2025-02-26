"use client";

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { NavIconProps, StatCardProps, CourseCardProps, TaskItemProps } from './types';

export const NavIcon: React.FC<NavIconProps & { onClick?: () => void }> = ({ icon, active = false, onClick }) => (
  <button 
    className={`h-10 w-10 mb-2 rounded-lg flex items-center justify-center transition-colors duration-200 custom-cursor ${
      active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
    }`}
    onClick={onClick}
  >
    {icon}
  </button>
);

export const StatCard: React.FC<StatCardProps> = ({ icon, title, subtitle, color }) => (
  <div className={`${color} rounded-xl p-4 flex items-center`}>
    <div className="bg-white rounded-lg p-3 mr-4 shadow-sm">
      {icon}
    </div>
    <div>
      <h3 className="font-bold text-gray-900">{title}</h3>
      <p className="text-xs text-gray-600">{subtitle}</p>
    </div>
  </div>
);

export const CourseCard: React.FC<CourseCardProps> = ({ icon, title, progress, tag, completion, time }) => (
  <div className="flex items-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition cursor-pointer custom-cursor">
    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 mr-4">
      {icon}
    </div>
    <div className="flex-1">
      <div className="flex items-center mb-1">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          {tag}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
        <div 
          className="bg-indigo-600 h-1.5 rounded-full" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{completion}</span>
        <span>{time}</span>
      </div>
    </div>
    <ChevronRight className="w-5 h-5 text-gray-300 ml-4" />
  </div>
);

export const TaskItem: React.FC<TaskItemProps> = ({ icon, title, dueDate, urgent = false }) => (
  <div className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition cursor-pointer custom-cursor">
    {icon}
    <div className="ml-3 flex-1">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className={`text-xs ${urgent ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
        {dueDate}
      </p>
    </div>
    <ChevronRight className="w-5 h-5 text-gray-300" />
  </div>
);
