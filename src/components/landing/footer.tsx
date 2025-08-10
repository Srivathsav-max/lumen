"use client";
import React from "react";
import Link from "next/link";
import { IconBrandGithub, IconBrandTwitter, IconBrandDiscord } from "@tabler/icons-react";
import { Star } from "lucide-react";
import { FlickeringGrid } from "@/components/magicui/flickering-grid";
import { BoxReveal } from "@/components/magicui/box-reveal";

export function Footer() {
  return (
    <>
      {/* Flickering Grid Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <FlickeringGrid
            className="z-0 inset-0 size-full"
            squareSize={4}
            gridGap={6}
            color="#3b82f6"
            maxOpacity={0.5}
            flickerChance={0.1}
          />
        </div>
        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="mx-auto max-w-4xl text-center">
            <BoxReveal boxColor="#3b82f6" duration={0.5}>
              <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-white">
                Ready to transform your
              </h2>
            </BoxReveal>
            <BoxReveal boxColor="#8b5cf6" duration={0.5}>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mt-2">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  knowledge workflow?
                </span>
              </h2>
            </BoxReveal>
            <BoxReveal boxColor="#06b6d4" duration={0.6}>
              <p className="mt-6 text-xl leading-8 text-gray-600 dark:text-gray-300">
                Join thousands of teams already using Lumen to organize, share, and build upon their collective knowledge.
              </p>
            </BoxReveal>
            <BoxReveal boxColor="#10b981" duration={0.5}>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link href="/auth/register">
                  <button className="inline-flex items-center px-8 py-3 text-base font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 border border-transparent rounded-lg shadow-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all">
                    Start for free
                  </button>
                </Link>
                <Link href="/contact">
                  <button className="inline-flex items-center px-8 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800">
                    Contact sales
                  </button>
                </Link>
              </div>
            </BoxReveal>
          </div>
        </div>
      </section>

      {/* Traditional Footer */}
      <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-black">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="py-16">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
              {/* Logo and description */}
              <div className="lg:col-span-2">
                <Link href="/" className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                    <Star className="h-4 w-4 fill-white text-white" />
                  </div>
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">Lumen</span>
                </Link>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mb-6">
                  The future of knowledge management. Transform scattered thoughts into structured brilliance 
                  with AI-powered intelligence that understands how your team thinks and works.
                </p>
                <div className="flex items-center gap-4">
                  <a
                    href="https://github.com/lumen"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    aria-label="GitHub"
                  >
                    <IconBrandGithub className="h-5 w-5" />
                  </a>
                  <a
                    href="https://twitter.com/lumen"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    aria-label="Twitter"
                  >
                    <IconBrandTwitter className="h-5 w-5" />
                  </a>
                  <a
                    href="https://discord.gg/lumen"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    aria-label="Discord"
                  >
                    <IconBrandDiscord className="h-5 w-5" />
                  </a>
                </div>
              </div>

              {/* Navigation links */}
              <div className="grid grid-cols-2 gap-8 lg:grid-cols-3 lg:col-span-3">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Product</h3>
                  <ul className="space-y-2 text-sm">
                    <li><Link href="/features" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Features</Link></li>
                    <li><Link href="/pricing" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Pricing</Link></li>
                    <li><Link href="/integrations" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Integrations</Link></li>
                    <li><Link href="/api" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">API</Link></li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Resources</h3>
                  <ul className="space-y-2 text-sm">
                    <li><Link href="/docs" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Documentation</Link></li>
                    <li><Link href="/guides" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Guides</Link></li>
                    <li><Link href="/blog" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Blog</Link></li>
                    <li><Link href="/changelog" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Changelog</Link></li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Company</h3>
                  <ul className="space-y-2 text-sm">
                    <li><Link href="/about" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">About</Link></li>
                    <li><Link href="/careers" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Careers</Link></li>
                    <li><Link href="/contact" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Contact</Link></li>
                    <li><Link href="/partners" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Partners</Link></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Bottom section */}
            <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-8 md:flex-row dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                © {new Date().getFullYear()} Lumen Inc. All rights reserved. 
                <span className="ml-4">
                  <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy</Link>
                  {" • "}
                  <Link href="/terms" className="hover:text-gray-900 dark:hover:text-white transition-colors">Terms</Link>
                  {" • "}
                  <Link href="/security" className="hover:text-gray-900 dark:hover:text-white transition-colors">Security</Link>
                </span>
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}


