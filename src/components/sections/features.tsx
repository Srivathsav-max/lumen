"use client";

import { BrainCircuit, BookText, Network, LineChart, Users } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";

interface GridItemProps {
  area: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  code?: string;
}

const GridItem = ({ area, icon, title, description, code }: GridItemProps) => {
  return (
    <li className={cn("min-h-[14rem] list-none", area)}>
      <div className="relative h-full rounded-2.5xl border border-gray-200 p-2 md:rounded-3xl md:p-3">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
        />
        <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.5px] border-gray-200 p-6 dark:border-neutral-800">
          <div className="relative flex flex-1 flex-col justify-between gap-3">
            <div className="w-fit rounded-lg border border-gray-200 p-2 dark:border-neutral-800">
              {icon}
            </div>
            <div className="space-y-3">
              <h3 className="pt-0.5 text-xl/[1.375rem] font-semibold font-sans -tracking-4 md:text-2xl/[1.875rem] text-balance text-black dark:text-white">
                {title}
              </h3>
              <p className="font-sans text-sm/[1.125rem] md:text-base/[1.375rem] text-gray-600 dark:text-neutral-400">
                {description}
              </p>
              {code && (
                <div className="mt-4 bg-gray-50 rounded-lg p-3 font-mono text-sm text-gray-600 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{code}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

export function FeaturesSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-small opacity-10"></div>
      <div className="absolute right-0 top-1/4 w-1/2 h-1/2 bg-gradient-to-l from-indigo-500/10 to-transparent"></div>
      <div className="absolute left-0 bottom-0 w-1/2 h-1/2 bg-gradient-to-r from-purple-500/10 to-transparent"></div>
      
      <div className="container relative mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-500 to-purple-500">
            AI-Powered Learning Platform
          </h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            Our platform combines advanced AI with proven learning methodologies to create 
            a personalized and effective learning experience.
          </p>
        </div>

        <ul className="grid grid-cols-1 grid-rows-none gap-4 md:grid-cols-12 md:grid-rows-3 lg:gap-6 xl:max-h-[34rem] xl:grid-rows-2">
          <GridItem
            area="md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/5]"
            icon={<BrainCircuit className="h-4 w-4 text-black dark:text-neutral-400" />}
            title="Adaptive Learning"
            description="Dynamic content adjustment based on your performance and learning patterns."
            code={`// Adaptive Difficulty Scaling
const nextContent = await AI.adapt({
  performance: user.metrics,
  pattern: user.learningStyle,
  target: user.goals
});`}
          />

          <GridItem
            area="md:[grid-area:1/7/2/13] xl:[grid-area:2/1/3/5]"
            icon={<BookText className="h-4 w-4 text-black dark:text-neutral-400" />}
            title="Smart Notes"
            description="AI-powered note synthesis with automatic concept linking and spaced repetition."
            code={`// Smart Note Generation
const notes = await AI.synthesize({
  content: lecture.transcript,
  style: user.preferences,
  level: user.proficiency
});`}
          />

          <GridItem
            area="md:[grid-area:2/1/3/7] xl:[grid-area:1/5/3/8]"
            icon={<Network className="h-4 w-4 text-black dark:text-neutral-400" />}
            title="Knowledge Graphs"
            description="Visual concept mapping with dynamic prerequisite detection and learning paths."
            code={`// Knowledge Graph Analysis
const conceptMap = await Graph.build({
  topics: course.modules,
  relations: user.progress,
  gaps: AI.detectGaps()
});`}
          />

          <GridItem
            area="md:[grid-area:2/7/3/13] xl:[grid-area:1/8/2/13]"
            icon={<LineChart className="h-4 w-4 text-black dark:text-neutral-400" />}
            title="Progress Analytics"
            description="Advanced analytics with predictive scoring and personalized insights."
            code={`// Learning Prediction
const forecast = ML.predict({
  history: user.progress,
  trends: user.performance,
  goals: user.targets
});`}
          />

          <GridItem
            area="md:[grid-area:3/1/4/13] xl:[grid-area:2/8/3/13]"
            icon={<Users className="h-4 w-4 text-black dark:text-neutral-400" />}
            title="Collaborative Learning"
            description="Intelligent team formation and peer learning optimization."
            code={`// Team Formation
const group = await AI.formTeam({
  skills: user.competencies,
  goals: project.requirements,
  synergy: ML.calculateFit()
});`}
          />
        </ul>
      </div>
    </section>
  );
}
