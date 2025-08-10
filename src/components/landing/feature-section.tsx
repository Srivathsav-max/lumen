"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { BoxReveal } from "@/components/magicui/box-reveal";
import {
  IconBrain,
  IconSearch,
  IconUsers,
  IconRocket,
  IconShield,
  IconBolt,
  IconCloud,
  IconBulb,
} from "@tabler/icons-react";

const FEATURES = [
  {
    title: "AI-Powered Intelligence",
    description:
      "Transform scattered thoughts into structured knowledge with advanced AI that understands context and relationships.",
    icon: <IconBrain />,
  },
  {
    title: "Lightning Search",
    description:
      "Find any information instantly across all your documents, notes, and conversations with semantic search.",
    icon: <IconSearch />,
  },
  {
    title: "Real-time Collaboration",
    description:
      "Work together seamlessly with your team. Share knowledge, co-create, and build on each other's ideas.",
    icon: <IconUsers />,
  },
  {
    title: "Instant Publishing",
    description:
      "From draft to publication in one click. Share knowledge internally or with the world at lightning speed.",
    icon: <IconRocket />,
  },
  {
    title: "Enterprise Security",
    description:
      "Bank-level encryption, SSO integration, and compliance-ready features protect your valuable knowledge.",
    icon: <IconShield />,
  },
  {
    title: "Smart Automation",
    description:
      "Automate knowledge capture, categorization, and distribution. Focus on creating, not organizing.",
    icon: <IconBolt />,
  },
  {
    title: "Global Sync",
    description:
      "Access your knowledge anywhere, anytime. Seamless sync across all devices and platforms.",
    icon: <IconCloud />,
  },
  {
    title: "Insight Generation",
    description:
      "Discover patterns and connections in your knowledge base that you never knew existed.",
    icon: <IconBulb />,
  },
];

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature dark:border-neutral-800",
        (index === 0 || index === 4) && "lg:border-l dark:border-neutral-800",
        index < 4 && "lg:border-b dark:border-neutral-800"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-blue-50 dark:from-blue-950/20 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-blue-50 dark:from-blue-950/20 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-blue-600 dark:text-blue-400">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 dark:bg-neutral-700 group-hover/feature:bg-gradient-to-b group-hover/feature:from-blue-500 group-hover/feature:to-purple-500 transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-800 dark:text-neutral-100">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};

export function FeatureSection({ className }: { className?: string }) {
  return (
    <section className={cn("py-24 md:py-32 relative", className)}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/30 to-transparent dark:via-blue-950/10" />
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <BoxReveal boxColor="#3b82f6" duration={0.5}>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl dark:text-white">
              Everything you need to
            </h2>
          </BoxReveal>
          <BoxReveal boxColor="#8b5cf6" duration={0.5}>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mt-2">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                revolutionize knowledge work
              </span>
            </h2>
          </BoxReveal>
          <BoxReveal boxColor="#06b6d4" duration={0.6}>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              From scattered ideas to structured insights. Lumen transforms how modern teams 
              create, share, and build upon knowledge.
            </p>
          </BoxReveal>
        </div>

        {/* Features grid with hover effects */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 py-10 max-w-7xl mx-auto">
          {FEATURES.map((feature, index) => (
            <Feature key={feature.title} {...feature} index={index} />
          ))}
        </div>

        {/* Bottom section */}
        <div className="mt-16 text-center">
          <BoxReveal boxColor="#10b981" duration={0.5}>
            <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              Trusted by 50,000+ knowledge workers worldwide
            </div>
          </BoxReveal>
        </div>
      </div>
    </section>
  );
}


