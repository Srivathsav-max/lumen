import React from 'react';

interface WorkflowStepProps {
  number: string;
  title: string;
  description: string;
  isLast: boolean;
}

export const WorkflowStep: React.FC<WorkflowStepProps> = ({ 
  number, 
  title, 
  description, 
  isLast 
}) => {
  return (
    <div className="flex group">
      <div className="flex flex-col items-center mr-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg group-hover:from-indigo-500 group-hover:to-purple-500 transition-all">
          {number}
        </div>
        {!isLast && <div className="h-full w-0.5 bg-gray-200 group-hover:bg-indigo-100 transition-colors mt-2"></div>}
      </div>
      <div className="pb-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{title}</h4>
        <p className="text-gray-600 group-hover:text-gray-700 transition-colors">{description}</p>
      </div>
    </div>
  );
};
