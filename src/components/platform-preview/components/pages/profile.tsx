"use client";

import React from 'react';
import { 
  User, 
  Trophy,
  BookOpen,
  Clock,
  Star,
  Calendar,
  Settings,
  Edit,
  FileText,
  BadgeCheck,
  GraduationCap,
  Heart,
  LineChart
} from 'lucide-react';

export const ProfilePage = () => {
  const achievements = [
    { title: 'Early Adopter', description: 'Joined during beta phase', icon: <Star className="w-5 h-5 text-yellow-500" /> },
    { title: 'Quick Learner', description: '5 courses completed', icon: <GraduationCap className="w-5 h-5 text-blue-500" /> },
    { title: 'Active Contributor', description: 'Helped 50+ learners', icon: <Heart className="w-5 h-5 text-red-500" /> }
  ];

  const stats = [
    { label: 'Courses Completed', value: '12', icon: <BookOpen className="w-5 h-5 text-indigo-500" /> },
    { label: 'Learning Hours', value: '156', icon: <Clock className="w-5 h-5 text-blue-500" /> },
    { label: 'Knowledge Points', value: '4,280', icon: <Trophy className="w-5 h-5 text-yellow-500" /> },
    { label: 'Contributions', value: '32', icon: <Heart className="w-5 h-5 text-red-500" /> }
  ];

  return (
    <div className="h-full flex flex-col bg-white rounded-lg overflow-hidden">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center text-3xl font-bold backdrop-blur-sm">
                AJ
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">Alex Johnson</h1>
                <p className="text-indigo-100">Machine Learning Enthusiast</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1 text-sm">
                    <BadgeCheck className="w-4 h-4" /> Verified Learner
                  </span>
                  <span className="flex items-center gap-1 text-sm">
                    <Calendar className="w-4 h-4" /> Joined January 2025
                  </span>
                </div>
              </div>
              <button className="p-2 rounded-full hover:bg-white/10">
                <Edit className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                {stat.icon}
                <div className="mt-2 text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Learning Progress */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Current Progress</h2>
                <LineChart className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                {[
                  { course: 'Advanced Machine Learning', progress: 75 },
                  { course: 'Neural Networks', progress: 45 },
                  { course: 'Deep Learning', progress: 30 }
                ].map((course, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{course.course}</span>
                      <span className="text-gray-500">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full" 
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Achievements</h2>
                <Trophy className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                {achievements.map((achievement, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                      {achievement.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{achievement.title}</h3>
                      <p className="text-sm text-gray-500">{achievement.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
