"use client";

import React, { useState } from 'react';
import { 
  BarChart2, 
  ArrowRight, 
  Download, 
  Sparkles, 
  Info, 
  Lightbulb,
  Network,
  Clock,
  BookOpen
} from 'lucide-react';

export const LearningAnalytics = () => {
  const [dateRange, setDateRange] = useState('week');
  const [activeMetric, setActiveMetric] = useState('progress');

  const weeklyData = [
    { day: 'M', value: 30, highlight: false },
    { day: 'T', value: 45, highlight: false },
    { day: 'W', value: 25, highlight: false },
    { day: 'T', value: 80, highlight: true },
    { day: 'F', value: 35, highlight: false },
    { day: 'S', value: 50, highlight: false },
    { day: 'S', value: 20, highlight: false },
  ];

  const insights = [
    {
      type: 'success',
      icon: <Sparkles className="w-5 h-5" />,
      title: 'Strong Performance',
      message: 'Your proficiency in Neural Networks is in the top 10% of learners.',
      color: 'green'
    },
    {
      type: 'warning',
      icon: <Info className="w-5 h-5" />,
      title: 'Knowledge Gap',
      message: 'Backpropagation concepts need more attention.',
      color: 'yellow'
    },
    {
      type: 'tip',
      icon: <Lightbulb className="w-5 h-5" />,
      title: 'Recommendation',
      message: 'Ready to advance to Transformer Models.',
      color: 'indigo'
    }
  ];

  const timeDistribution = [
    { topic: 'Machine Learning', percentage: 45, color: 'indigo' },
    { topic: 'Neural Networks', percentage: 30, color: 'purple' },
    { topic: 'NLP', percentage: 15, color: 'blue' },
    { topic: 'Reinforcement Learning', percentage: 10, color: 'green' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Learning Analytics</h2>
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 rounded-lg p-1 flex">
              {['week', 'month', 'year'].map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1 text-sm rounded-md ${
                    dateRange === range ? 'bg-white shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
            <button className="text-sm px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { title: 'Overall Progress', value: '68%', increase: '12% this month', icon: <BookOpen className="w-5 h-5 text-indigo-500" /> },
            { title: 'Time Spent', value: '23 hrs', increase: '4.2 hrs this week', icon: <Clock className="w-5 h-5 text-indigo-500" /> },
            { title: 'Concepts Mastered', value: '42', increase: '8 new this month', icon: <Network className="w-5 h-5 text-indigo-500" /> },
            { title: 'Skill Level', value: 'Advanced', increase: 'Top 15%', icon: <BarChart2 className="w-5 h-5 text-indigo-500" /> }
          ].map((metric, idx) => (
            <div 
              key={idx}
              className={`p-4 rounded-xl border ${
                activeMetric === metric.title.toLowerCase() 
                  ? 'border-indigo-200 bg-indigo-50 ring-2 ring-indigo-500/30' 
                  : 'border-gray-200 hover:bg-gray-50'
              } cursor-pointer`}
              onClick={() => setActiveMetric(metric.title.toLowerCase())}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">{metric.title}</span>
                {metric.icon}
              </div>
              <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
              <div className="text-sm text-green-600 flex items-center mt-1">
                <ArrowRight className="w-3 h-3 mr-1" />
                <span>{metric.increase}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Chart */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-gray-700">Weekly Progress</h3>
          <select className="text-xs border-none bg-gray-100 rounded-md px-2 py-1">
            <option>Previous Period</option>
            <option>Course Average</option>
            <option>Personal Goal</option>
          </select>
        </div>
        
      <div className="h-64 p-4 relative">
        {/* Chart Area */}
        <svg className="w-full h-full">
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          
          {/* Area Chart */}
          <path
            d={`M0 ${64 * 0.7} ${Array(7).fill(0).map((_, i) => 
              `L ${i * (400/6)} ${64 * (1 - [0.3, 0.5, 0.4, 0.8, 0.6, 0.7, 0.4][i])}`
            ).join(' ')} V 64 H 0 Z`}
            fill="url(#gradient)"
            className="transform scale-y-95"
          />
          
          {/* Line Chart */}
          <path
            d={`M0 ${64 * 0.7} ${Array(7).fill(0).map((_, i) => 
              `L ${i * (400/6)} ${64 * (1 - [0.3, 0.5, 0.4, 0.8, 0.6, 0.7, 0.4][i])}`
            ).join(' ')}`}
            stroke="rgb(99, 102, 241)"
            strokeWidth="2"
            fill="none"
            className="transform scale-y-95"
          />
          
          {/* Data Points */}
          {[0.3, 0.5, 0.4, 0.8, 0.6, 0.7, 0.4].map((value, i) => (
            <circle
              key={i}
              cx={i * (400/6)}
              cy={64 * (1 - value)}
              r="4"
              fill="white"
              stroke="rgb(99, 102, 241)"
              strokeWidth="2"
              className="transform scale-y-95"
            />
          ))}
        </svg>
        
        {/* X-Axis Labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
            <span key={i} className="text-xs text-gray-500">{day}</span>
          ))}
        </div>
      </div>
      </div>

      {/* Insights */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Learning Insights</h3>
        <div className="space-y-3">
          {insights.map((insight, idx) => (
            <div 
              key={idx}
              className={`flex items-start gap-3 p-3 bg-${insight.color}-50 rounded-lg border border-${insight.color}-100`}
            >
              <div className={`w-8 h-8 rounded-full bg-${insight.color}-100 flex items-center justify-center text-${insight.color}-600`}>
                {insight.icon}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">{insight.title}</h4>
                <p className="text-sm text-gray-500">{insight.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time Distribution */}
      <div className="p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Time Distribution</h3>
        <div className="space-y-4">
          {timeDistribution.map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-500">{item.topic}</span>
                <span className="text-sm font-medium text-gray-900">{item.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`bg-${item.color}-500 h-2 rounded-full`} 
                  style={{ width: `${item.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
