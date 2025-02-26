"use client";
import React, { useEffect, useState } from "react";
import { BackgroundLines } from "@/components/ui/background-lines";
import { Button as MovingBorderButton } from "@/components/ui/moving-border";
import { FooterSection } from "@/components/sections/footer";
import { Navbar } from "@/components/ui/navbar";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

export default function WaitlistPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <ScrollToTop/>
      <BackgroundLines className="relative flex flex-col items-center justify-center antialiased overflow-hidden">
        <Navbar />
        <div className="max-w-2xl mx-auto p-4 relative z-10 mt-24">
          <h1 className="text-4xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-center font-sans font-bold mb-4">
            Join the Waitlist
          </h1>
          <p className="text-gray-600 max-w-lg mx-auto my-6 text-lg md:text-xl text-center leading-relaxed">
            Be the first to experience Moxium. A revolutionary platform that empowers students to achieve their learning goals through collaborative studying and AI assistance.
          </p>
          <div className="mt-10 relative z-10">
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full px-6 py-4 rounded-2xl border border-gray-200/60 focus:ring-2 focus:ring-indigo-500 bg-white/90 backdrop-blur-sm text-gray-800 placeholder:text-gray-400 shadow-lg hover:shadow-xl transition-all text-lg mb-8"
          />
            <MovingBorderButton
            borderRadius="1.25rem"
            className="bg-slate-900/[0.8] text-white border-slate-800 w-full h-14 text-base font-medium hover:scale-[1.01] transition-all duration-300"
            containerClassName="w-full"
            borderClassName="h-32 w-32 opacity-[0.8] bg-[radial-gradient(var(--blue-500)_40%,transparent_60%)]"
            >
              Join Now
            </MovingBorderButton>
          </div>
        </div>
      </BackgroundLines>
      <FooterSection />
    </main>
  );
}
