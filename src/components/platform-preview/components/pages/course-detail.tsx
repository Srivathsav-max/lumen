"use client";

import React, { useState } from 'react';
import { 
  Clock, 
  BookOpen, 
  Star, 
  Share2, 
  ArrowLeft,
  MessageCircle,
  Code,
  FileText,
  PlayCircle,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

export const CourseDetailPage = () => {
  const [activeTab, setActiveTab] = useState('content');
  const [activeModule, setActiveModule] = useState(0);
  const [expandedModules, setExpandedModules] = useState([0]);
  
  const courseModules = [
    {
      title: "Introduction to Machine Learning",
      lessons: [
        { title: "What is Machine Learning?", duration: "12 min", completed: true },
        { title: "Types of Machine Learning", duration: "15 min", completed: true },
        { title: "ML Applications & Use Cases", duration: "18 min", completed: false },
        { title: "Quiz: Introduction to ML", type: "quiz", duration: "10 min", completed: false }
      ]
    },
    {
      title: "Supervised Learning Algorithms",
      lessons: [
        { title: "Linear Regression", duration: "22 min", completed: false },
        { title: "Logistic Regression", duration: "18 min", completed: false },
        { title: "Decision Trees", duration: "25 min", completed: false },
        { title: "Support Vector Machines", duration: "20 min", completed: false },
        { title: "Practice Exercise", type: "exercise", duration: "30 min", completed: false }
      ]
    },
    {
      title: "Unsupervised Learning",
      lessons: [
        { title: "Clustering Algorithms", duration: "20 min", completed: false },
        { title: "K-Means Clustering", duration: "15 min", completed: false },
        { title: "Dimensionality Reduction", duration: "18 min", completed: false },
        { title: "Principal Component Analysis", duration: "22 min", completed: false }
      ]
    }
  ];
  
  const toggleModule = (index: number) => {
    if (expandedModules.includes(index)) {
      setExpandedModules(expandedModules.filter(i => i !== index));
    } else {
      setExpandedModules([...expandedModules, index]);
    }
  };
  
  return (
    <div className="h-full flex flex-col bg-white rounded-lg">
      {/* Course Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Back to Courses</span>
        </div>
        
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Advanced</div>
              <div className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">Machine Learning</div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Advanced Machine Learning</h1>
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                <span>12 hours</span>
              </div>
              <div className="flex items-center">
                <BookOpen className="w-4 h-4 mr-1" />
                <span>24 lessons</span>
              </div>
              <div className="flex items-center">
                <Star className="w-4 h-4 mr-1 text-yellow-400" />
                <span>4.8 (235 reviews)</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              Continue Learning
            </button>
          </div>
        </div>
        
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">Your Progress</span>
            <span className="text-sm text-gray-500">15 of 24 lessons completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '62.5%' }}></div>
          </div>
        </div>
      </div>
      
      {/* Course Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex px-6">
          {['content', 'overview', 'notes', 'discussion'].map(tab => (
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
      
      {/* Course Content */}
      <div className="flex-1 flex">
        {/* Left: Modules List */}
        <div className="w-1/3 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          {courseModules.map((module, moduleIndex) => (
            <div key={moduleIndex} className="p-4">
              <button 
                className={`w-full flex items-center justify-between p-3 rounded-lg ${
                  activeModule === moduleIndex ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-100'
                }`}
                onClick={() => toggleModule(moduleIndex)}
              >
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                    activeModule === moduleIndex ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {moduleIndex + 1}
                  </div>
                  <span className="font-medium text-sm">{module.title}</span>
                </div>
                <ChevronDown 
                  className={`w-5 h-5 transition-transform ${
                    expandedModules.includes(moduleIndex) ? 'transform rotate-180' : ''
                  }`} 
                />
              </button>
              
              {expandedModules.includes(moduleIndex) && (
                <div className="ml-8 mt-1 space-y-1">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <div 
                      key={lessonIndex}
                      className={`flex items-center p-2 rounded-lg text-sm ${
                        lesson.completed ? 'text-gray-400' : 'text-gray-700'
                      } hover:bg-gray-100 cursor-pointer`}
                    >
                      <div className="w-5 h-5 mr-3">
                        {lesson.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : lesson.type === 'quiz' ? (
                          <FileText className="w-5 h-5 text-orange-400" />
                        ) : lesson.type === 'exercise' ? (
                          <Code className="w-5 h-5 text-purple-400" />
                        ) : (
                          <PlayCircle className="w-5 h-5 text-indigo-400" />
                        )}
                      </div>
                      <div className="flex-1">{lesson.title}</div>
                      <div className="text-xs text-gray-400">{lesson.duration}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Right: Lesson Content */}
        <div className="w-2/3 p-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg mb-6">
              <div className="flex items-center justify-center">
                <PlayCircle className="w-16 h-16 text-indigo-300" />
              </div>
            </div>
            
            <div className="prose prose-sm max-w-none">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Understanding Linear Regression</h2>
              <p>Linear regression is a fundamental algorithm in machine learning, used to predict a continuous outcome variable based on one or more predictor variables.</p>
              <p>The model assumes that there is a linear relationship between the input variables and the output. The goal is to find the best-fitting line through the data points.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
