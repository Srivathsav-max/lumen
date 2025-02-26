"use client";

import React, { useState } from 'react';
import { BrainCircuit, Send } from 'lucide-react';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

export const AIAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m Lumen, your AI learning assistant. How can I help you today?' },
    { role: 'user', content: 'I\'m having trouble understanding backpropagation in neural networks.' },
    { role: 'assistant', content: 'I understand backpropagation can be challenging. Let me help break it down:\n\n1. Forward Pass: Data flows through the network\n2. Calculate Error: Compare output with expected result\n3. Backward Pass: Update weights based on contribution to error\n\nWould you like me to explain any of these steps in more detail?' }
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    setMessages([...messages, { role: 'user', content: newMessage }]);
    setNewMessage('');
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm analyzing your question. Let me prepare a helpful response..."
      }]);
    }, 500);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-sm overflow-hidden text-white h-full flex flex-col">
      <div className="px-6 py-4 border-b border-white/10 flex items-center">
        <BrainCircuit className="w-5 h-5 mr-2" />
        <h2 className="text-lg font-semibold">Lumen AI Assistant</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'assistant' 
                  ? 'bg-white/10' 
                  : 'bg-white/20'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1">
                    <BrainCircuit className="w-4 h-4 text-purple-300" />
                    <p className="text-purple-200 text-xs">Lumen</p>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything..."
            className="flex-1 bg-white/10 rounded-lg px-4 py-2 text-sm placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          <button 
            onClick={handleSend}
            className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
