"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BoxReveal } from "@/components/magicui/box-reveal";

type HeroProps = {
  className?: string;
};

export function Hero({ className }: HeroProps) {
  return (
    <section className={cn("relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24", className)}>
      {/* Enhanced background with better gradients */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-950 dark:via-blue-950/20 dark:to-indigo-950/10" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
      </div>

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-blue-400/30 via-purple-400/20 to-indigo-400/30 blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-purple-400/30 via-pink-400/20 to-rose-400/30 blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-48 rounded-full bg-gradient-to-br from-cyan-400/20 via-blue-400/20 to-indigo-400/20 blur-3xl animate-pulse delay-500" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Announcement badge */}
          <div className="mb-8">
            <BoxReveal boxColor="#3b82f6" duration={0.5}>
              <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                Introducing Lumen — The future of knowledge management
              </div>
            </BoxReveal>
          </div>

          {/* Main heading with staggered reveals */}
          <div className="mb-8">
            <BoxReveal boxColor="#8b5cf6" duration={0.6}>
              <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl dark:text-white mb-2">
                Transform Ideas into
              </h1>
            </BoxReveal>
            <BoxReveal boxColor="#06b6d4" duration={0.6}>
              <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl mb-2">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Knowledge
                </span>
              </h1>
            </BoxReveal>
            <BoxReveal boxColor="#10b981" duration={0.6}>
              <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl dark:text-white">
                at Light Speed
              </h1>
            </BoxReveal>
          </div>

          {/* Description */}
          <div className="mb-10">
            <BoxReveal boxColor="#f59e0b" duration={0.7}>
              <p className="mx-auto max-w-2xl text-xl leading-8 text-gray-600 dark:text-gray-300">
                Create, organize, and share knowledge with an AI-powered editor designed for modern teams. 
                From scattered thoughts to structured brilliance in seconds.
              </p>
            </BoxReveal>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center mb-16">
            <BoxReveal boxColor="#ef4444" duration={0.5}>
              <Link href="/auth/register">
                <Button 
                  size="lg" 
                  className="h-12 rounded-lg px-8 text-base font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Start Creating Free →
                </Button>
              </Link>
            </BoxReveal>
            <BoxReveal boxColor="#8b5cf6" duration={0.5}>
              <Link href="#demo">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="h-12 rounded-lg border-gray-300 px-8 text-base font-medium transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800/50"
                >
                  Watch Demo
                </Button>
              </Link>
            </BoxReveal>
          </div>

          {/* Enhanced stats with better descriptions */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <BoxReveal boxColor="#06b6d4" duration={0.5}>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">10M+</div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">Documents created</div>
              </div>
            </BoxReveal>
            <BoxReveal boxColor="#10b981" duration={0.5}>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">50K+</div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">Active knowledge workers</div>
              </div>
            </BoxReveal>
            <BoxReveal boxColor="#f59e0b" duration={0.5}>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">99.9%</div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">Knowledge retention rate</div>
              </div>
            </BoxReveal>
          </div>
        </div>
      </div>
    </section>
  );
}


