"use client";

import { BrainCircuit, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { MoxiumLumenEffect } from "../ui/google-gemini-effect";
import React, { useRef } from "react";

export function HeroSection() {
  const ref = useRef(null);
  return (
    <section className="relative min-h-[100vh] flex items-center overflow-hidden bg-white" ref={ref}>
      <div className="absolute inset-0 bg-grid-small opacity-5"></div>
      <div className="absolute inset-0 opacity-75">
        <MoxiumLumenEffect />
      </div>
      
      <div className="container relative mx-auto px-4 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-1 text-sm text-indigo-600 ring-1 ring-inset ring-indigo-500/20 hover:bg-white/20 transition-colors">
              <Sparkles className="h-4 w-4" />
              <span>Introducing AI-Powered Learning</span>
            </div>
          </div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center text-5xl md:text-7xl font-bold mb-8">
            <span className="text-gray-900">
              Transform Your Learning Journey
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl text-center text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Experience personalized learning powered by advanced AI. Our platform adapts to your unique learning style, 
            helping you master concepts faster and retain knowledge longer.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-white font-medium transition-all hover:scale-105 bg-black hover:bg-gray-800">
              <BrainCircuit className="w-5 h-5 mr-2" />
              Start Learning for Free
            </button>
            <button className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-gray-900 font-medium border-2 border-gray-200 hover:border-gray-300 transition-colors bg-white">
              Watch How It Works
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-20 grid grid-cols-3 gap-8 text-center max-w-3xl mx-auto"
          >
            {[
              { value: "99%", label: "Success Rate" },
              { value: "50K+", label: "Active Learners" },
              { value: "4.9/5", label: "User Rating" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                  {stat.value}
                </div>
                <div className="text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
