import React from 'react';
import { BrainCircuit, BookText, Network, LineChart, Users, Shield } from "lucide-react";

const FeatureItem = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="group relative">
    <div className="absolute -inset-px bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-lg blur opacity-15 group-hover:opacity-25 transition-opacity"></div>
    <div className="relative bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/60 p-6 shadow-lg hover:shadow-xl transition-all">
      <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
        <Icon className="w-6 h-6 text-indigo-600 group-hover:text-indigo-500 transition-colors" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{title}</h3>
      <p className="text-gray-600 text-sm group-hover:text-gray-700 transition-colors">{description}</p>
    </div>
  </div>
);

const MasteryProgressBar = ({ label, percentage, color }: { label: string, percentage: number, color: string }) => (
  <div className="mt-3">
    <div className="mb-1 flex justify-between">
      <span className="text-xs text-gray-600">{label}</span>
      <span className="text-xs text-gray-600">{percentage}%</span>
    </div>
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all duration-500 ease-out`} style={{width: `${percentage}%`}}></div>
    </div>
  </div>
);

export const FeaturesTab = () => {
  return (
    <div>
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Key Features</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Our platform offers comprehensive features that transform the learning experience through personalization,
          engagement, and data-driven insights.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <FeatureItem
          icon={BrainCircuit}
          title="Personalized Learning Paths"
          description="Dynamic content adaptation based on individual learning patterns, pacing, and knowledge gaps."
        />
        
        <FeatureItem
          icon={BookText}
          title="Smart Notes & Synthesis"
          description="AI-powered note generation with spaced repetition scheduling optimized for long-term retention."
        />
        
        <FeatureItem
          icon={Network}
          title="Visual Knowledge Graphs"
          description="Interactive concept mapping that visualizes relationships between topics and identifies learning gaps."
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <FeatureItem
          icon={LineChart}
          title="Predictive Analytics"
          description="Forecast exam performance and identify areas needing attention through statistical learning models."
        />
        
        <FeatureItem
          icon={Users}
          title="Collaborative Learning"
          description="Intelligent team formation based on complementary skills with role-based group assignments."
        />
        
        <FeatureItem
          icon={Shield}
          title="Integrity & Privacy"
          description="Sophisticated cheat detection combined with federated learning to preserve data privacy."
        />
      </div>
      
      <div className="mt-10">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg blur-xl"></div>
          <div className="relative bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-lg overflow-hidden shadow-lg">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Interactive Demo: Knowledge Mastery Tracking</h3>
              <p className="text-gray-600 mb-6">
                Our system combines multiple signals to estimate a learner &apos; s mastery level, adapting content difficulty accordingly.
              </p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-200/50">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Mastery Calculation</h4>
                  <div className="text-sm text-gray-700 font-mono bg-white/50 p-3 rounded overflow-x-auto border border-gray-200/50">
                    <div>Combined Score = 0.7 × Basic + 0.3 × Advanced</div>
                    <div className="mt-2">Where:</div>
                    <div className="ml-4 mt-1">- Basic: Core progress metrics</div>
                    <div className="ml-4">- Advanced: Detailed analysis metrics</div>
                  </div>
                  
                  <MasteryProgressBar label="Mastery: Python Variables" percentage={88} color="bg-green-500/80" />
                  <MasteryProgressBar label="Mastery: Python Loops" percentage={64} color="bg-yellow-500/80" />
                  <MasteryProgressBar label="Mastery: Python Functions" percentage={42} color="bg-red-500/80" />
                </div>
                
                <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-200/50">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Adaptive Content Selection</h4>
                  
                  <div className="space-y-4">
                    <div className="border border-gray-200/50 rounded p-3 bg-white/50 group hover:border-indigo-500/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-600 text-sm font-medium group-hover:text-indigo-500">Basic: Variables Quiz</span>
                        <span className="text-green-600 text-xs">Completed</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 group-hover:text-gray-700">Recommended when mastery &lt; 50%</p>
                    </div>
                    
                    <div className="border border-gray-200/50 rounded p-3 bg-white/50 group hover:border-indigo-500/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-600 text-sm font-medium group-hover:text-indigo-500">Intermediate: Loops Practice</span>
                        <span className="text-yellow-600 text-xs">In Progress</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 group-hover:text-gray-700">Recommended when mastery between 50% - 75%</p>
                    </div>
                    
                    <div className="border border-gray-200/50 rounded p-3 bg-white/50 group hover:border-indigo-500/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-600 text-sm font-medium group-hover:text-indigo-500">Advanced: Functions Challenge</span>
                        <span className="text-gray-500 text-xs">Locked</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 group-hover:text-gray-700">Unlocks when mastery &gt; 75%</p>
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
