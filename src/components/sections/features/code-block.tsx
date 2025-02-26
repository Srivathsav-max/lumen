"use client";
import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { IconCheck, IconCopy } from "@tabler/icons-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'typescript', title }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-md border border-gray-200 w-full shadow-sm">
      <div className="bg-gray-100 px-4 py-2 text-xs flex items-center justify-between border-b border-gray-200">
        <div className="flex space-x-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
        </div>
        <span className="text-gray-600">{title}</span>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
        </button>
      </div>
      <div className="bg-white relative">
        <div className="absolute left-0 top-0 bottom-0 w-[3.5em] bg-[#fafafa] border-r border-[#eee]"></div>
        <SyntaxHighlighter
          language={language}
          style={{
            ...oneLight,
            'pre[class*="language-"]': {
              ...oneLight['pre[class*="language-"]'],
              background: 'transparent',
              margin: 0,
            },
            'code[class*="language-"]': {
              ...oneLight['code[class*="language-"]'],
              background: 'transparent',
            }
          }}
          customStyle={{
            margin: 0,
            padding: '1rem 1rem 1rem 5em',
            background: 'transparent',
            fontSize: '0.75rem',
          }}
          showLineNumbers={true}
          lineNumberStyle={{
            color: '#999',
            textAlign: 'right',
            width: '2em',
            paddingRight: '-1.5em',
            position: 'absolute',
            left: 0,
            userSelect: 'none'
          }}
        >
          {String(code).trim()}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};
