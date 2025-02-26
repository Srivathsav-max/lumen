import React from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, title }) => {
  return (
    <div className="bg-gray-50/80 backdrop-blur-sm rounded-md overflow-hidden border border-gray-200/60 w-full shadow-sm">
      <div className="bg-gray-100/80 px-4 py-2 text-xs flex items-center justify-between border-b border-gray-200/60">
        <div className="flex space-x-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
        </div>
        <span className="text-gray-600">{title}</span>
        <span className="text-gray-500">{language}</span>
      </div>
      <pre className="p-4 text-xs overflow-x-auto bg-white/50">
        <code className="text-gray-800 font-mono">
          {code}
        </code>
      </pre>
    </div>
  );
};
