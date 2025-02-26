import React from 'react';
import { WorkflowStep } from './workflow-step';
import { BarChart, Users } from "lucide-react";

export const WorkflowTab = () => {
  return (
    <div>
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">User Journey Workflow</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          The Moxium platform guides learners through a personalized journey that continuously adapts to their needs.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-1">
          <div className="relative">
            <div className="absolute -inset-px bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg blur-xl"></div>
            <div className="relative bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/60 p-6 sticky top-6 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Core Workflow</h3>
              
              <div className="space-y-6">
                <WorkflowStep 
                  number="1" 
                  title="Psychometric Assessment"
                  description="Initial diagnostic assessment combining self-reported skills and objective quizzes to establish a baseline."
                  isLast={false}
                />
                
                <WorkflowStep 
                  number="2" 
                  title="Dynamic Roadmap Generation"
                  description="AI creates a personalized learning path using advanced topic prioritization and concept mapping."
                  isLast={false}
                />
                
                <WorkflowStep 
                  number="3" 
                  title="Adaptive Learning Loop"
                  description="Content delivery that adjusts in real-time based on performance, identifying and addressing knowledge gaps."
                  isLast={false}
                />
                
                <WorkflowStep 
                  number="4" 
                  title="Progress Analytics"
                  description="Detailed insights into learning progress with predictive models for exam readiness and performance."
                  isLast={false}
                />
                
                <WorkflowStep 
                  number="5" 
                  title="Social & Organizational Integration"
                  description="Facilitates collaborative learning through intelligent team formation and shared knowledge graphs."
                  isLast={true}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2">
          <div className="relative">
            <div className="absolute -inset-px bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg blur-xl"></div>
            <div className="relative bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/60 overflow-hidden shadow-lg">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Learning Workflow Visualization</h3>
                
                <div className="relative pt-6 pb-1">
                  <div className="absolute inset-0 flex items-center justify-center opacity-5">
                    <div className="w-full h-full bg-indigo-100 rounded-full scale-[2] blur-3xl"></div>
                  </div>
                  
                  <div className="relative z-10 bg-gray-50/50 rounded-lg p-6 border border-gray-200/50 mb-8 shadow-lg">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Analytics & Collaboration</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/50 p-4 rounded border border-gray-200/60 shadow-sm hover:shadow transition-shadow">
                        <div className="flex items-center mb-2">
                          <BarChart className="w-5 h-5 text-indigo-400 mr-2" />
                          <h5 className="text-sm font-medium text-indigo-600">Predictive Analytics</h5>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">Advanced performance prediction based on historical data</p>
                        <div className="bg-white/80 p-2 rounded border border-gray-200/60">
                  <div className="text-xs font-mono text-gray-700">Success Rate = Total Progress / Time</div>
                  <div className="text-xs font-mono text-gray-700 mt-1">Adjusted for individual learning pace</div>
                        </div>
                      </div>
                      
                      <div className="bg-white/50 p-4 rounded border border-gray-200/60 shadow-sm hover:shadow transition-shadow">
                        <div className="flex items-center mb-2">
                          <Users className="w-5 h-5 text-indigo-400 mr-2" />
                          <h5 className="text-sm font-medium text-indigo-600">Collaborative Learning</h5>
                        </div>
                        <p className="text-xs text-gray-600 mb-3">Intelligent team formation based on complementary skills</p>
                        
                        <div className="flex gap-1 justify-around">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600/80 to-indigo-500/80 flex items-center justify-center text-white text-xs font-medium">A</div>
                            <span className="text-xs text-gray-600 mt-1">Researcher</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600/80 to-purple-500/80 flex items-center justify-center text-white text-xs font-medium">B</div>
                            <span className="text-xs text-gray-600 mt-1">Coder</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600/80 to-blue-500/80 flex items-center justify-center text-white text-xs font-medium">C</div>
                            <span className="text-xs text-gray-600 mt-1">Analyst</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-600/80 to-green-500/80 flex items-center justify-center text-white text-xs font-medium">D</div>
                            <span className="text-xs text-gray-600 mt-1">Presenter</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative mt-8">
            <div className="absolute -inset-px bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg blur-xl"></div>
            <div className="relative bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/60 overflow-hidden shadow-lg">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">AI Methodology Implementation</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200/60">
                        <th className="text-left py-3 px-4 text-gray-900 font-medium">AI Component</th>
                        <th className="text-left py-3 px-4 text-gray-900 font-medium">Implementation</th>
                        <th className="text-left py-3 px-4 text-gray-900 font-medium">Primary Benefit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/60">
                      <tr>
                        <td className="py-3 px-4 text-indigo-600">Progress Tracking</td>
                        <td className="py-3 px-4 text-gray-700">Multi-factor analysis with advanced learning metrics</td>
                        <td className="py-3 px-4 text-gray-700">Precise skill assessment</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-indigo-600">Learning Analysis</td>
                        <td className="py-3 px-4 text-gray-700">Advanced pattern recognition and sequence analysis</td>
                        <td className="py-3 px-4 text-gray-700">Behavioral insights</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-indigo-600">Knowledge Mapping</td>
                        <td className="py-3 px-4 text-gray-700">Intelligent topic relationship analysis</td>
                        <td className="py-3 px-4 text-gray-700">Comprehensive understanding</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-indigo-600">Path Optimization</td>
                        <td className="py-3 px-4 text-gray-700">Smart decision system with adaptive strategies</td>
                        <td className="py-3 px-4 text-gray-700">Personalized learning</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
