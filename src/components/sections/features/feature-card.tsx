import React from 'react';
import { CodeBlock } from './code-block';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  code?: string;
  codeTitle?: string;
  language?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ 
  icon, 
  title, 
  description, 
  code, 
  codeTitle, 
  language 
}) => {
  return (
    <div className="group relative">
      {/* Enhanced glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-blue-500/30 rounded-xl blur-lg opacity-20 group-hover:opacity-40 transition-all duration-300"></div>
      
      {/* Card content with glossy effect */}
      <div className="relative bg-gradient-to-b from-white/90 via-white/80 to-white/90 backdrop-blur-md rounded-xl overflow-hidden border border-white/40 shadow-lg group-hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
        {/* Glossy highlight effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-transparent opacity-50 pointer-events-none"></div>
        <div className="p-7">
          <div className="flex items-center mb-5">
            <div className="w-11 h-11 text-indigo-600 mr-4 group-hover:text-indigo-500 transition-all duration-300 transform group-hover:scale-110">
              {icon}
            </div>
            <h3 className="text-xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 group-hover:from-indigo-600 group-hover:to-purple-600 transition-all duration-300">{title}</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4 leading-relaxed group-hover:text-gray-700 transition-colors">{description}</p>
        </div>
        {code && (
          <div className="mt-auto p-5 pt-0">
            <CodeBlock code={code} title={codeTitle} language={language} />
          </div>
        )}
      </div>
    </div>
  );
};
