"use client";

import React, { useState } from 'react';
import { 
  Users, 
  MessageCircle, 
  Share2, 
  Bell, 
  ArrowLeft, 
  Calendar,
  BookOpen,
  Network,
  PlusCircle,
  User,
  ChevronRight,
  UserPlus,
  Heart,
  Clock,
  PlayCircle,
  Code
} from 'lucide-react';

export const StudyGroupPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <div className="h-full flex flex-col bg-white rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Back to Groups</span>
        </div>
        
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
              ML
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Machine Learning Study Group</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  <span>18 members</span>
                </div>
                <div className="flex items-center">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  <span>Active discussion</span>
                </div>
                <div className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  Public
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100">
              <Bell className="w-5 h-5" />
            </button>
            <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              Join Group
            </button>
          </div>
        </div>
      </div>
      
      {/* Group Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex px-6">
          {['overview', 'discussions', 'resources', 'members', 'events'].map(tab => (
            <button
              key={tab}
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === tab
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Group Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* About */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">About this group</h2>
              </div>
              <div className="p-4">
                <p className="text-gray-700 mb-4">
                  Welcome to the Machine Learning Study Group! We &apos;re a community of students and professionals passionate about ML and AI. Let &apos; learn together!
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-500 mr-1" />
                    <span>Created on Jan 15, 2025</span>
                  </div>
                  <div className="flex items-center">
                    <BookOpen className="w-4 h-4 text-gray-500 mr-1" />
                    <span>Related to 3 courses</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Sessions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">Upcoming Study Sessions</h2>
                  <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                    <PlusCircle className="w-4 h-4" />
                    Schedule Session
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                <div className="p-4">
                  <div className="flex gap-4">
                    <div className="w-16 bg-indigo-50 text-center p-2 rounded-lg">
                      <div className="text-xs text-indigo-600 font-medium">FEB</div>
                      <div className="text-xl font-bold text-indigo-600">28</div>
                      <div className="text-xs text-indigo-600">7:00 PM</div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Neural Networks Deep Dive</h3>
                      <p className="text-sm text-gray-500 mb-2">Join us for an interactive session on neural network architectures.</p>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-200 border-2 border-white"></div>
                          <div className="w-6 h-6 rounded-full bg-purple-200 border-2 border-white"></div>
                          <div className="w-6 h-6 rounded-full bg-pink-200 border-2 border-white text-xs flex items-center justify-center">+5</div>
                        </div>
                        <span className="text-xs text-gray-500">8 attending</span>
                        <button className="ml-auto px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">
                          RSVP
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Discussions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">Recent Discussions</h2>
                  <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    New Topic
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                <div className="p-4 hover:bg-gray-50">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">Best practices for neural networks?</h3>
                        <span className="text-sm text-gray-500">2h ago</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Looking for tips on optimizing neural network architectures...</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          8 replies
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          12 likes
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Members */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">Members</h2>
                  <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                    View All
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm">
                        JD
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">John Doe</p>
                        <p className="text-xs text-gray-500">Group Admin</p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <button className="mt-4 w-full flex items-center justify-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm hover:bg-indigo-100">
                  <UserPlus className="w-4 h-4" />
                  <span>Invite Member</span>
                </button>
              </div>
            </div>

            {/* Resources */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Resources</h2>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">ML Cheatsheet</p>
                      <p className="text-xs text-gray-500">Shared by John</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <Code className="w-5 h-5 text-purple-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Code Samples</p>
                      <p className="text-xs text-gray-500">Shared by Alice</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
