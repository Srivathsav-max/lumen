import React, { useState } from 'react';
import { 
  BookOpen, 
  Brain, 
  Calendar, 
  ChevronRight, 
  Clock, 
  Code, 
  Compass, 
  Crown, 
  FileText, 
  Flame, 
  Home, 
  Lightbulb, 
  LineChart, 
  LogOut, 
  MessageSquare, 
  Network, 
  Search, 
  Settings, 
  Trophy, 
  User, 
  Users,
  BrainCircuit,
  BookMarked,
  GraduationCap,
  Braces,
  Zap,
  BarChart2,
  Bell,
  ChevronDown,
  MoreHorizontal,
  PlusCircle,
  ArrowRight,
  Send,
  Sparkles,
  CheckCircle2,
  PlayCircle,
  Star,
  Info,
  HelpCircle,
  Download,
  ExternalLink,
  ArrowLeft,
  Lock,
  Unlock,
  Award,
  Filter,
  BookOpen as BookIcon, // Using a different name to avoid confusion
  Share2,
  Edit,
  UserPlus,
  X,
  Check,
  AlarmClock,
  Layers,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Heart
} from 'lucide-react';

// ========= 1. KNOWLEDGE GRAPH PAGE =========
export const KnowledgeGraphPage = () => {
  const [activeView, setActiveView] = useState('graph');
  const [focusNode, setFocusNode] = useState('machine-learning');
  const [zoomLevel, setZoomLevel] = useState(1);
  
  return (
    <div className="h-full flex flex-col bg-white rounded-lg">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Knowledge Graph</h1>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              <Filter className="w-4 h-4 inline mr-1" />
              Filter
            </button>
            <button className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <Sparkles className="w-4 h-4 inline mr-1" />
              Suggested Path
            </button>
          </div>
        </div>
        
        <div className="flex mt-4 gap-4">
          <button 
            className={`px-3 py-1.5 text-sm font-medium rounded-lg ${activeView === 'graph' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setActiveView('graph')}
          >
            <Network className="w-4 h-4 inline mr-1" />
            Graph View
          </button>
          <button 
            className={`px-3 py-1.5 text-sm font-medium rounded-lg ${activeView === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setActiveView('list')}
          >
            <Layers className="w-4 h-4 inline mr-1" />
            List View
          </button>
          <button 
            className={`px-3 py-1.5 text-sm font-medium rounded-lg ${activeView === 'mastery' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setActiveView('mastery')}
          >
            <Trophy className="w-4 h-4 inline mr-1" />
            Mastery Progress
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-4 relative">
        {/* Graph View */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Interactive visualization of the knowledge graph */}
          <div className="h-full w-full bg-gray-50 rounded-lg p-4 relative">
            <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-md p-2 flex gap-2">
              <button className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-100">
                <PlusCircle className="w-5 h-5 text-gray-600" />
              </button>
              <button className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-100">
                <Network className="w-5 h-5 text-gray-600" />
              </button>
              <button className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-100">
                <Download className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="absolute inset-0 overflow-hidden">
              {/* Simulated Knowledge Graph - In a real implementation, this would be a proper visualization library */}
              <div className="absolute left-1/4 top-1/3 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setFocusNode('machine-learning')}>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-sm font-medium ${focusNode === 'machine-learning' ? 'bg-indigo-600 text-white ring-4 ring-indigo-200' : 'bg-indigo-100 text-indigo-800'}`}>
                  Machine Learning
                </div>
              </div>
              <div className="absolute left-1/2 top-1/4 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setFocusNode('deep-learning')}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-sm font-medium ${focusNode === 'deep-learning' ? 'bg-purple-600 text-white ring-4 ring-purple-200' : 'bg-purple-100 text-purple-800'}`}>
                  Deep Learning
                </div>
              </div>
              <div className="absolute left-2/3 top-1/3 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setFocusNode('neural-networks')}>
                <div className={`w-18 h-18 rounded-full flex items-center justify-center text-sm font-medium ${focusNode === 'neural-networks' ? 'bg-blue-600 text-white ring-4 ring-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                  Neural Networks
                </div>
              </div>
              <div className="absolute left-1/3 top-2/3 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setFocusNode('reinforcement-learning')}>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-sm font-medium ${focusNode === 'reinforcement-learning' ? 'bg-green-600 text-white ring-4 ring-green-200' : 'bg-green-100 text-green-800'}`}>
                  Reinforcement Learning
                </div>
              </div>
              <div className="absolute left-1/2 top-2/3 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setFocusNode('nlp')}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-sm font-medium ${focusNode === 'nlp' ? 'bg-yellow-600 text-white ring-4 ring-yellow-200' : 'bg-yellow-100 text-yellow-800'}`}>
                  NLP
                </div>
              </div>
              <div className="absolute left-2/3 top-3/4 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setFocusNode('transformers')}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-sm font-medium ${focusNode === 'transformers' ? 'bg-orange-600 text-white ring-4 ring-orange-200' : 'bg-orange-100 text-orange-800'}`}>
                  Transformers
                </div>
              </div>
              
              {/* Connection lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line x1="25%" y1="33%" x2="50%" y2="25%" stroke="#a8b1ff" strokeWidth="2" />
                <line x1="25%" y1="33%" x2="33%" y2="67%" stroke="#a8b1ff" strokeWidth="2" />
                <line x1="50%" y1="25%" x2="67%" y2="33%" stroke="#a8b1ff" strokeWidth="2" />
                <line x1="33%" y1="67%" x2="50%" y2="67%" stroke="#a8b1ff" strokeWidth="2" />
                <line x1="67%" y1="33%" x2="67%" y2="75%" stroke="#a8b1ff" strokeWidth="2" />
              </svg>
              
              {/* Mastery indicators */}
              <div className="absolute left-1/4 top-1/3 transform translate-x-8 -translate-y-8">
                <div className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs">92% Mastery</div>
              </div>
              <div className="absolute left-2/3 top-1/3 transform translate-x-8 -translate-y-8">
                <div className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">78% Mastery</div>
              </div>
              <div className="absolute left-1/2 top-2/3 transform translate-x-6 -translate-y-8">
                <div className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs">66% Mastery</div>
              </div>
              <div className="absolute left-2/3 top-3/4 transform translate-x-8 -translate-y-8">
                <div className="px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs">42% Mastery</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Node Info Panel - Appears when a node is clicked */}
        {focusNode && (
          <div className="absolute top-4 right-4 w-72 bg-white rounded-xl shadow-lg p-4 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {focusNode === 'machine-learning' ? 'Machine Learning' : 
                 focusNode === 'deep-learning' ? 'Deep Learning' : 
                 focusNode === 'neural-networks' ? 'Neural Networks' : 
                 focusNode === 'reinforcement-learning' ? 'Reinforcement Learning' : 
                 focusNode === 'nlp' ? 'Natural Language Processing' : 'Transformers'}
              </h3>
              <button className="text-gray-400 hover:text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-500">Mastery Level</span>
                  <span className="text-sm font-medium text-gray-900">
                    {focusNode === 'machine-learning' ? '92%' : 
                     focusNode === 'deep-learning' ? '85%' : 
                     focusNode === 'neural-networks' ? '78%' : 
                     focusNode === 'reinforcement-learning' ? '62%' : 
                     focusNode === 'nlp' ? '66%' : '42%'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-indigo-600 h-1.5 rounded-full" 
                    style={{ width: focusNode === 'machine-learning' ? '92%' : 
                                   focusNode === 'deep-learning' ? '85%' : 
                                   focusNode === 'neural-networks' ? '78%' : 
                                   focusNode === 'reinforcement-learning' ? '62%' : 
                                   focusNode === 'nlp' ? '66%' : '42%' }}
                  ></div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Related Concepts</h4>
                <div className="space-y-1">
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                    <span>Deep Learning</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                    <span>Neural Networks</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                    <span>Reinforcement Learning</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Recommended Content</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <BookIcon className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm">Advanced ML Concepts</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <PlayCircle className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm">Video: ML in Practice</span>
                  </div>
                </div>
              </div>
              
              <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                Study This Concept
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ========= 2. COURSE DETAIL PAGE =========
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
        { title: "Practice Exercise: Classification", type: "exercise", duration: "30 min", completed: false }
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
  
  const toggleModule = (index) => {
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
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'content'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('content')}
          >
            Course Content
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'overview'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'notes'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('notes')}
          >
            Notes
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'discussion'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('discussion')}
          >
            Discussion
          </button>
        </div>
      </div>
      
      {/* Course Content */}
      <div className="flex-1 flex">
        {/* Left: Modules List */}
        <div className="w-1/3 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <div className="p-4">
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="Search in course..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          
          <div className="px-2">
            {courseModules.map((module, moduleIndex) => (
              <div key={moduleIndex} className="mb-2">
                <button 
                  className={`w-full flex items-center justify-between p-3 rounded-lg ${activeModule === moduleIndex ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-100'}`}
                  onClick={() => toggleModule(moduleIndex)}
                >
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${activeModule === moduleIndex ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600'}`}>
                      {moduleIndex + 1}
                    </div>
                    <span className="font-medium text-sm">{module.title}</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 transition-transform ${expandedModules.includes(moduleIndex) ? 'transform rotate-180' : ''}`} />
                </button>
                
                {expandedModules.includes(moduleIndex) && (
                  <div className="ml-8 mt-1 space-y-1">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <div 
                        key={lessonIndex}
                        className={`flex items-center p-2 rounded-lg text-sm ${lesson.completed ? 'text-gray-400' : 'text-gray-700'} hover:bg-gray-100 cursor-pointer`}
                      >
                        <div className="w-5 h-5 mr-3">
                          {lesson.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            lesson.type === 'quiz' ? (
                              <FileText className="w-5 h-5 text-orange-400" />
                            ) : lesson.type === 'exercise' ? (
                              <Code className="w-5 h-5 text-purple-400" />
                            ) : (
                              <PlayCircle className="w-5 h-5 text-indigo-400" />
                            )
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
        </div>
        
        {/* Right: Lesson Content */}
        <div className="w-2/3 p-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg mb-6 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <PlayCircle className="w-16 h-16 mx-auto mb-2 text-indigo-300" />
                <p>Video Lesson: Linear Regression</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              
              <div className="text-sm text-gray-500">
                Lesson 2 of 24
              </div>
              
              <button className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Understanding Linear Regression</h2>
              
              <div className="prose prose-sm max-w-none">
                <p>Linear regression is a fundamental algorithm in machine learning, used to predict a continuous outcome variable based on one or more predictor variables.</p>
                
                <p>The model assumes that there is a linear relationship between the input variables and the output. The goal is to find the best-fitting line through the data points, which minimizes the sum of squared errors.</p>
                
                <h3>Key Concepts</h3>
                
                <ul>
                  <li><strong>Dependent and Independent Variables</strong>: In linear regression, we try to predict the dependent variable using one or more independent variables.</li>
                  <li><strong>Simple vs. Multiple Linear Regression</strong>: Simple linear regression uses one independent variable, while multiple linear regression uses two or more.</li>
                  <li><strong>Cost Function</strong>: The mean squared error (MSE) is commonly used to measure how well the model fits the data.</li>
                  <li><strong>Gradient Descent</strong>: An optimization algorithm used to minimize the cost function.</li>
                </ul>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 my-4">
                  <div className="font-medium text-gray-900 mb-2">Python Example</div>
                  <pre className="bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-x-auto">
{`import numpy as np
from sklearn.linear_model import LinearRegression
import matplotlib.pyplot as plt

# Generate sample data
np.random.seed(0)
X = np.random.rand(100, 1)
y = 2 + 3 * X + np.random.rand(100, 1)

# Fit the model
model = LinearRegression()
model.fit(X, y)

# Print results
print('Intercept:', model.intercept_)
print('Coefficient:', model.coef_)

# Plot the results
plt.scatter(X, y, s=10)
plt.plot(X, model.predict(X), color='r')
plt.xlabel('X')
plt.ylabel('y')
plt.title('Linear Regression Example')
plt.show()`}
                  </pre>
                </div>
              </div>
              
              <div className="mt-8 space-y-4">
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Did this lesson help you?</h3>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                      <ThumbsUp className="w-4 h-4" />
                      <span>Yes</span>
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                      <ThumbsDown className="w-4 h-4" />
                      <span>No</span>
                    </button>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Questions about this lesson?</h3>
                  <button className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm hover:bg-indigo-100">
                    <MessageCircle className="w-4 h-4" />
                    <span>Ask in Discussion</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========= 3. AI ASSISTANT CHAT PAGE =========
export const AiAssistantPage = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m Lumen, your AI learning assistant. How can I help you today?' },
    { role: 'user', content: 'I\'m having trouble understanding backpropagation in neural networks. Can you explain it simply?' },
    { role: 'assistant', content: 'Of course! Backpropagation is like learning from your mistakes. Think of it as a neural network playing a game:\n\n1. The network makes a prediction (forward pass)\n2. It sees how far off it was from the correct answer (calculates error)\n3. It updates its internal settings (weights) to do better next time\n\nThe key insight is that it works backwards through the network, adjusting each layer based on how much that layer contributed to the error.\n\nWould you like me to go deeper into the mathematics, or would you prefer a visual explanation?' },
  ]);
  
  const [newMessage, setNewMessage] = useState('');
  const [suggestions, setSuggestions] = useState([
    'Show me a visual explanation of backpropagation',
    'Explain the mathematics behind it',
    'What are common problems with backpropagation?',
    'How does this relate to what I\'m learning in the Neural Networks course?'
  ]);
  
  const sendMessage = () => {
    if (newMessage.trim() === '') return;
    
    setMessages([...messages, { role: 'user', content: newMessage }]);
    setNewMessage('');
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prevMessages => [
        ...prevMessages, 
        { 
          role: 'assistant', 
          content: 'I\'m analyzing your question about backpropagation. Let me prepare a detailed explanation with some helpful diagrams to make it clearer...' 
        }
      ]);
    }, 500);
  };
  
  return (
    <div className="h-full flex flex-col bg-white rounded-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Lumen AI Assistant</h1>
              <p className="text-sm text-gray-500">Personalized learning guidance</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
          >
            <div 
              className={`max-w-3/4 rounded-lg p-4 ${
                message.role === 'assistant' 
                  ? 'bg-indigo-50 text-gray-800' 
                  : 'bg-indigo-600 text-white'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white">
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-indigo-600">Lumen</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button 
                key={index}
                className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-lg text-sm hover:bg-gray-200"
                onClick={() => {
                  setMessages([...messages, { role: 'user', content: suggestion }]);
                  setSuggestions([]);
                  
                  // Simulate AI response
                  setTimeout(() => {
                    setMessages(prevMessages => [
                      ...prevMessages, 
                      { 
                        role: 'assistant', 
                        content: 'I\'m working on your question. Let me put together a detailed response...' 
                      }
                    ]);
                  }, 500);
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="w-full pl-4 pr-10 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-indigo-600"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
          <button 
            className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            onClick={sendMessage}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500 text-center">
          Lumen is connected to your courses and progress data to provide personalized guidance.
        </div>
      </div>
    </div>
  );
};

// ========= 4. ANALYTICS DASHBOARD PAGE =========
export const AnalyticsDashboardPage = () => {
  const [dateRange, setDateRange] = useState('week');
  const [activeMetric, setActiveMetric] = useState('progress');
  
  return (
    <div className="h-full flex flex-col bg-white rounded-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-900">Learning Analytics</h1>
          
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 rounded-lg p-1 flex">
              <button 
                className={`px-3 py-1 text-sm rounded-md ${dateRange === 'week' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                onClick={() => setDateRange('week')}
              >
                Week
              </button>
              <button 
                className={`px-3 py-1 text-sm rounded-md ${dateRange === 'month' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                onClick={() => setDateRange('month')}
              >
                Month
              </button>
              <button 
                className={`px-3 py-1 text-sm rounded-md ${dateRange === 'year' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                onClick={() => setDateRange('year')}
              >
                Year
              </button>
            </div>
            
            <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
        
        {/* Metric Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div 
            className={`p-4 rounded-xl border ${activeMetric === 'progress' ? 'border-indigo-200 bg-indigo-50 ring-2 ring-indigo-500/30' : 'border-gray-200 hover:bg-gray-50'} cursor-pointer`}
            onClick={() => setActiveMetric('progress')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Overall Progress</span>
              <BookOpen className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">68%</div>
            <div className="text-sm text-green-600 flex items-center mt-1">
              <ArrowRight className="w-3 h-3 mr-1" />
              <span>12% this month</span>
            </div>
          </div>
          
          <div 
            className={`p-4 rounded-xl border ${activeMetric === 'time' ? 'border-indigo-200 bg-indigo-50 ring-2 ring-indigo-500/30' : 'border-gray-200 hover:bg-gray-50'} cursor-pointer`}
            onClick={() => setActiveMetric('time')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Time Spent</span>
              <Clock className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">23 hrs</div>
            <div className="text-sm text-green-600 flex items-center mt-1">
              <ArrowRight className="w-3 h-3 mr-1" />
              <span>4.2 hrs this week</span>
            </div>
          </div>
          
          <div 
            className={`p-4 rounded-xl border ${activeMetric === 'concepts' ? 'border-indigo-200 bg-indigo-50 ring-2 ring-indigo-500/30' : 'border-gray-200 hover:bg-gray-50'} cursor-pointer`}
            onClick={() => setActiveMetric('concepts')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Concepts Mastered</span>
              <Network className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">42</div>
            <div className="text-sm text-green-600 flex items-center mt-1">
              <ArrowRight className="w-3 h-3 mr-1" />
              <span>8 new this month</span>
            </div>
          </div>
          
          <div 
            className={`p-4 rounded-xl border ${activeMetric === 'streak' ? 'border-indigo-200 bg-indigo-50 ring-2 ring-indigo-500/30' : 'border-gray-200 hover:bg-gray-50'} cursor-pointer`}
            onClick={() => setActiveMetric('streak')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Learning Streak</span>
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">5 days</div>
            <div className="text-sm text-gray-500 flex items-center mt-1">
              <ArrowRight className="w-3 h-3 mr-1" />
              <span>Best: 12 days</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column: Main Chart */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">
                  {activeMetric === 'progress' ? 'Progress Over Time' : 
                   activeMetric === 'time' ? 'Time Spent Learning' :
                   activeMetric === 'concepts' ? 'Concepts Mastered' : 'Learning Streak'}
                </h2>
                
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-500">Compare with:</div>
                  <select className="text-xs border-gray-200 rounded-md bg-gray-50 px-2 py-1">
                    <option>Previous Period</option>
                    <option>Course Average</option>
                    <option>Personal Goal</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="h-72 p-4 flex items-center justify-center">
              <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <LineChart className="w-12 h-12 mx-auto mb-2" />
                  <p>Interactive progress chart visualization</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column: Stats & Insights */}
          <div className="space-y-6">
            {/* Learning Insights */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Learning Insights</h2>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Strong Performance</h3>
                    <p className="text-sm text-gray-500">Your proficiency in Neural Networks is in the top 10% of learners.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                  <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Knowledge Gap</h3>
                    <p className="text-sm text-gray-500">You're struggling with Backpropagation concepts. Consider revisiting this topic.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Recommendation</h3>
                    <p className="text-sm text-gray-500">Based on your progress, you're ready to advance to Transformer Models.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Time Distribution */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Learning Distribution</h2>
              </div>
              
              <div className="p-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-500">Machine Learning</span>
                      <span className="text-sm font-medium text-gray-900">45%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-500">Neural Networks</span>
                      <span className="text-sm font-medium text-gray-900">30%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-500">NLP</span>
                      <span className="text-sm font-medium text-gray-900">15%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-500">Reinforcement Learning</span>
                      <span className="text-sm font-medium text-gray-900">10%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Row */}
        <div className="grid grid-cols-2 gap-6 mt-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
            </div>
            
            <div className="p-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Completed Lesson: Neural Networks Basics</h3>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Achievement Unlocked: ML Apprentice</h3>
                    <p className="text-xs text-gray-500">Yesterday</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Started Course: NLP with Transformers</h3>
                    <p className="text-xs text-gray-500">2 days ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Learning Goals */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Learning Goals</h2>
                <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                  Edit Goals
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900">Complete ML Course</span>
                    <span className="text-sm text-gray-500">Due in 2 weeks</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">65% complete</div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900">Weekly Learning: 5 hours</span>
                    <span className="text-sm text-gray-500">3 days left</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">2/5 hours complete</div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900">Master Neural Networks</span>
                    <span className="text-sm text-gray-500">Long-term</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">30% complete</div>
                </div>
              </div>
              
              <button className="mt-4 w-full flex items-center justify-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm hover:bg-indigo-100">
                <PlusCircle className="w-4 h-4" />
                <span>Add New Goal</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========= 5. STUDY GROUP PAGE =========
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
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'overview'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'discussions'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('discussions')}
          >
            Discussions
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'resources'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('resources')}
          >
            Resources
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'members'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('members')}
          >
            Members
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'events'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('events')}
          >
            Events
          </button>
        </div>
      </div>
      
      {/* Group Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-3 gap-6">
          {/* Main Content (2/3) */}
          <div className="col-span-2 space-y-6">
            {/* About */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">About this group</h2>
              </div>
              
              <div className="p-4">
                <p className="text-gray-700 mb-4">
                  Welcome to the Machine Learning Study Group! We &apos; re a community of students and professionals who are passionate about machine learning and AI. Our goal is to learn together, share resources, and help each other overcome challenges in the field of ML.
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
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Upcoming Study Sessions</h2>
                <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center">
                  <PlusCircle className="w-4 h-4 mr-1" />
                  <span>Schedule Session</span>
                </button>
              </div>
              
              <div className="p-4">
                <div className="space-y-4">
                  <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                    <div className="w-20 bg-indigo-50 flex flex-col items-center justify-center p-2">
                      <div className="text-xs text-indigo-600 font-medium">FEB</div>
                      <div className="text-xl font-bold text-indigo-600">28</div>
                      <div className="text-xs text-indigo-600">7:00 PM</div>
                    </div>
                    
                    <div className="flex-1 p-4">
                      <h3 className="text-md font-medium text-gray-900">Neural Networks Deep Dive</h3>
                      <p className="text-sm text-gray-500 mb-2">Join us for an interactive session on neural network architectures and their applications.</p>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-200 border-2 border-white"></div>
                          <div className="w-6 h-6 rounded-full bg-purple-200 border-2 border-white"></div>
                          <div className="w-6 h-6 rounded-full bg-pink-200 border-2 border-white text-xs flex items-center justify-center">+5</div>
                        </div>
                        <div className="text-xs text-gray-500">8 attending</div>
                        <div className="flex-1 text-right">
                          <button className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">
                            RSVP
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                    <div className="w-20 bg-indigo-50 flex flex-col items-center justify-center p-2">
                      <div className="text-xs text-indigo-600 font-medium">MAR</div>
                      <div className="text-xl font-bold text-indigo-600">05</div>
                      <div className="text-xs text-indigo-600">6:30 PM</div>
                    </div>
                    
                    <div className="flex-1 p-4">
                      <h3 className="text-md font-medium text-gray-900">Project Collaboration Session</h3>
                      <p className="text-sm text-gray-500 mb-2">Work together on ML projects, share progress, and get feedback from peers.</p>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          <div className="w-6 h-6 rounded-full bg-green-200 border-2 border-white"></div>
                          <div className="w-6 h-6 rounded-full bg-blue-200 border-2 border-white"></div>
                          <div className="w-6 h-6 rounded-full bg-yellow-200 border-2 border-white text-xs flex items-center justify-center">+3</div>
                        </div>
                        <div className="text-xs text-gray-500">6 attending</div>
                        <div className="flex-1 text-right">
                          <button className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">
                            RSVP
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Recent Discussions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Recent Discussions</h2>
                <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  <span>New Topic</span>
                </button>
              </div>
              
              <div className="divide-y divide-gray-200">
                <div className="p-4 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="text-md font-medium text-gray-900">Best approaches for sentiment analysis?</h3>
                        <span className="text-xs text-gray-500">2 hours ago</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">I'm working on a project analyzing customer reviews. Has anyone tried BERT or RoBERTa for sentiment analysis?</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center">
                          <MessageCircle className="w-4 h-4 mr-1" />
                          <span>8 replies</span>
                        </div>
                        <div className="flex items-center">
                          <Heart className="w-4 h-4 mr-1" />
                          <span>12 likes</span>
                        </div>
                        <div className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                          NLP
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="text-md font-medium text-gray-900">Resources for learning reinforcement learning</h3>
                        <span className="text-xs text-gray-500">Yesterday</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Can anyone recommend good books or courses on reinforcement learning for beginners?</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center">
                          <MessageCircle className="w-4 h-4 mr-1" />
                          <span>15 replies</span>
                        </div>
                        <div className="flex items-center">
                          <Heart className="w-4 h-4 mr-1" />
                          <span>20 likes</span>
                        </div>
                        <div className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
                          Resources
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sidebar (1/3) */}
          <div className="space-y-6">
            {/* Group Members */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Members</h2>
                <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                  View All
                </button>
              </div>
              
              <div className="p-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                        JD
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">John Doe</p>
                        <p className="text-xs text-gray-500">Group Admin</p>
                      </div>
                    </div>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-medium">
                        AS
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Alice Smith</p>
                        <p className="text-xs text-gray-500">ML Researcher</p>
                      </div>
                    </div>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                        RJ
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Robert Johnson</p>
                        <p className="text-xs text-gray-500">Data Scientist</p>
                      </div>
                    </div>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
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
            
            {/* Group Resources */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Popular Resources</h2>
              </div>
              
              <div className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">ML Cheat Sheet</p>
                      <p className="text-xs text-gray-500">Shared by John Doe</p>
                    </div>
                    <Download className="w-4 h-4 text-gray-400" />
                  </div>
                  
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <Code className="w-5 h-5 text-purple-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Sample ML Projects</p>
                      <p className="text-xs text-gray-500">Shared by Alice Smith</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </div>
                  
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <PlayCircle className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Deep Learning Tutorial</p>
                      <p className="text-xs text-gray-500">Shared by Robert Johnson</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                
                <button className="mt-4 w-full flex items-center justify-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm hover:bg-indigo-100">
                  <PlusCircle className="w-4 h-4" />
                  <span>Share Resource</span>
                </button>
              </div>
            </div>
            
            {/* Group Analytics */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Group Analytics</h2>
              </div>
              
              <div className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Group Activity</span>
                    <span className="text-sm font-medium text-green-600">↑ 25% this week</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-indigo-600">42</div>
                      <div className="text-xs text-gray-500">New posts</div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-indigo-600">128</div>
                      <div className="text-xs text-gray-500">Replies</div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-indigo-600">3</div>
                      <div className="text-xs text-gray-500">Study sessions</div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-indigo-600">18</div>
                      <div className="text-xs text-gray-500">Active members</div>
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