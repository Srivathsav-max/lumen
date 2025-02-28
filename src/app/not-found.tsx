"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Navbar } from "@/components/ui/navbar";
import { FooterSection } from "@/components/sections/footer";

export default function NotFound() {
  // Words that will be scrambled/unscrambled
  const [textState, setTextState] = useState({
    text: "404",
    scrambled: false
  });

  // Create text scramble effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTextState(prev => ({
        text: prev.scrambled ? "404" : generateRandomChars(3),
        scrambled: !prev.scrambled
      }));
    }, 150);
    
    return () => clearInterval(interval);
  }, []);

  const generateRandomChars = (length: number): string => {
    const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?/ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    return result;
  };

  return (
    <div className="min-h-screen w-full dark:bg-black bg-white dark:bg-dot-white/[0.2] bg-dot-black/[0.2] relative flex flex-col">
      <Navbar />
      <main className="h-screen flex items-center justify-center relative">
        <div className="absolute inset-0 bg-grid-small opacity-5"></div>
        <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              {/* Digital glitch effect with the 404 */}
              <div className="mb-8 relative">
                <h1 className="text-9xl font-bold font-mono text-black dark:text-white inline-block relative">
                  <span className="relative z-10 inline-block">
                    {textState.text}
                  </span>
                  <span className="absolute top-1 left-1 text-red-500 opacity-70 z-0">
                    {textState.text}
                  </span>
                </h1>
              </div>
              <p className="text-lg sm:text-xl text-neutral-800 dark:text-neutral-200 max-w-2xl mx-auto mb-8">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
              </p>
              
              <div className="space-y-4">
                <Link 
                  href="/" 
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full text-white font-medium transition-all duration-300 hover:scale-105 bg-black dark:bg-white dark:text-black border-2 border-transparent"
                >
                  Return Home
                </Link>
              </div>
            </div>
          </div>
        </div>
        <BackgroundBeams />
      </main>
      <FooterSection />
    </div>
  );
}