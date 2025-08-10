"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BoxReveal } from "@/components/magicui/box-reveal";
import { IconArrowRight, IconStar, IconCheck } from "@tabler/icons-react";

export function CTA({ className }: { className?: string }) {
  return (
    <section className={cn("relative py-24 md:py-32", className)}>
      {/* Background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 via-white to-gray-50/50 dark:from-gray-950/50 dark:via-black dark:to-gray-950/50" />
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative">
        <div className="mx-auto max-w-4xl">
          {/* Social proof section */}
          <div className="text-center mb-16">
            <BoxReveal boxColor="#f59e0b" duration={0.5}>
              <div className="flex items-center justify-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <IconStar key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </BoxReveal>
            <BoxReveal boxColor="#10b981" duration={0.5}>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                &ldquo;Lumen transformed how our team manages knowledge. We went from chaos to clarity in days.&rdquo;
              </p>
            </BoxReveal>
            <BoxReveal boxColor="#6b7280" duration={0.5}>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                — Sarah Chen, Head of Product at TechCorp
              </p>
            </BoxReveal>
          </div>

          {/* Main CTA */}
          <div className="text-center">
            <BoxReveal boxColor="#3b82f6" duration={0.5}>
              <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-white">
                Turn knowledge chaos into
              </h2>
            </BoxReveal>
            <BoxReveal boxColor="#8b5cf6" duration={0.5}>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mt-2">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  organized brilliance
                </span>
              </h2>
            </BoxReveal>
            
            <BoxReveal boxColor="#06b6d4" duration={0.6}>
              <p className="mt-6 text-xl leading-8 text-gray-600 dark:text-gray-300">
                Join 50,000+ knowledge workers who&apos;ve already transformed their workflow. 
                Start your free trial today.
              </p>
            </BoxReveal>

            <BoxReveal boxColor="#ef4444" duration={0.5}>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link href="/auth/register">
                  <Button 
                    size="lg"
                    className="h-12 rounded-lg px-8 text-base font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    Start Free Trial
                    <IconArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#demo">
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="h-12 rounded-lg border-gray-300 px-8 text-base font-medium transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800/50"
                  >
                    Watch Demo
                  </Button>
                </Link>
              </div>
            </BoxReveal>

            {/* Benefits */}
            <BoxReveal boxColor="#10b981" duration={0.6}>
              <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <IconCheck className="h-4 w-4 text-green-500" />
                  Free 14-day trial
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <IconCheck className="h-4 w-4 text-green-500" />
                  No credit card required
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <IconCheck className="h-4 w-4 text-green-500" />
                  Setup in under 5 minutes
                </div>
              </div>
            </BoxReveal>

            {/* Stats */}
            <BoxReveal boxColor="#8b5cf6" duration={0.7}>
              <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">40%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Faster knowledge discovery</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">3x</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">More efficient collaboration</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">90%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Reduction in information silos</div>
                </div>
              </div>
            </BoxReveal>
          </div>
        </div>
      </div>
    </section>
  );
}


