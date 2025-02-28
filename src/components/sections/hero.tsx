"use client";
import { BrainCircuit, Sparkles, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { MoxiumLumenEffect } from "../ui/google-gemini-effect";
import React, { useRef } from "react";
import { Navbar } from "../ui/navbar";

export function HeroSection() {
  const ref = useRef(null);
  
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-white to-gray-50" ref={ref}>
      <Navbar />
      <div className="absolute inset-0 bg-grid-small opacity-5"></div>
      <div className="absolute inset-0 w-screen h-full opacity-75 pointer-events-none overflow-hidden">
        <MoxiumLumenEffect />
      </div>
      
      {/* Add animation keyframes for gradient movement */}
      <style jsx global>{`
        @keyframes gradient-x {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s linear infinite;
        }
      `}</style>
      
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 z-10 mt-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm px-4 py-2 text-sm font-medium ring-1 ring-inset ring-indigo-500/20 hover:ring-indigo-500/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group">
              <Sparkles className="h-4 w-4 text-indigo-600 group-hover:text-indigo-500" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 group-hover:from-indigo-500 group-hover:via-purple-500 group-hover:to-blue-500">
                Moxium-Lumen: A Unit for Your Brilliance
              </span>
            </div>
          </div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 px-4"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600">
              Personalized Learning Paths,
            </span>
            <br />
            <span className="text-gray-900">
              Adaptive to Your Potential
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg sm:text-xl text-center text-gray-700 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed px-4"
          >
            Moxium combines <span className="font-semibold text-indigo-700">neural knowledge tracing</span> and <span className="font-semibold text-indigo-700">graph neural networks</span> to create learning experiences that adapt to your unique capabilities and learning pace, ensuring you master concepts completely rather than just collecting certifications.
          </motion.p>
  
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex justify-center px-4"
          >
            <div className="relative group">
              {/* Gradient border using pseudo-element */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full opacity-75 blur-sm group-hover:opacity-100 transition duration-300 animate-gradient-x"></div>
              
              {/* Inner glow effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full opacity-50 group-hover:opacity-70 transition duration-300"></div>
              
              {/* Main button */}
              <button className="relative inline-flex items-center justify-center px-8 py-4 rounded-full text-white font-medium transition-all duration-300 hover:scale-105 bg-black border-2 border-transparent text-base z-10">
                <Sparkles className="w-5 h-5 mr-2 text-indigo-400" />
                <span>Coming Soon</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
