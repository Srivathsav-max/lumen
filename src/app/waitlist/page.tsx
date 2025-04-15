"use client";
import React from "react";
import { BackgroundLines } from "@/components/ui/background-lines";
import { FooterSection } from "@/components/sections/footer";
import { Navbar } from "@/components/ui/navbar";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <ScrollToTop/>
      <BackgroundLines className="relative flex flex-col items-center justify-center antialiased overflow-hidden">
        <Navbar />
        <div className="max-w-2xl mx-auto p-4 relative z-10 mt-24">
          <h1 className="text-4xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-center font-sans font-bold mb-4">
            Waitlist Temporarily Closed
          </h1>
          <p className="text-gray-600 max-w-lg mx-auto my-6 text-lg md:text-xl text-center leading-relaxed">
            Thank you for your interest in Moxium. Our waitlist is currently closed while we prepare for the next phase of our launch. Please check back later.
          </p>
        </div>
      </BackgroundLines>
      <FooterSection />
    </main>
  );
}
