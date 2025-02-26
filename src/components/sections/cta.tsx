"use client";

import { Star, Sparkles, ArrowRight } from "lucide-react";

interface TestimonialProps {
  quote: string;
  author: string;
  role: string;
  rating: number;
}

const Testimonial = ({ quote, author, role, rating }: TestimonialProps) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
    <div className="flex gap-1 mb-4">
      {Array.from({ length: rating }).map((_, i) => (
        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
      ))}
    </div>
    <blockquote className="text-gray-700 mb-4">{quote}</blockquote>
    <div>
      <div className="font-semibold text-gray-900">{author}</div>
      <div className="text-sm text-gray-600">{role}</div>
    </div>
  </div>
);

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-small opacity-10"></div>
      <div className="absolute w-full h-full bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50"></div>
      
      <div className="container relative mx-auto px-4">
        {/* Testimonials */}
        <div className="mb-24">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center justify-center rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-600 ring-1 ring-inset ring-indigo-500/20 mb-6">
              <Sparkles className="w-4 h-4 mr-2" />
              What Learners Say
            </div>
            <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-500 to-purple-500">
              Loved by Students & Professionals
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Testimonial
              quote="The AI-powered learning paths and knowledge graphs have completely transformed how I understand complex topics. It's like having a personal tutor that knows exactly what I need."
              author="Sarah Chen"
              role="Computer Science Student"
              rating={5}
            />
            <Testimonial
              quote="As a working professional, the adaptive learning system helps me make the most of my limited study time. The personalized approach ensures I'm always learning effectively."
              author="Michael Rodriguez"
              role="Software Engineer"
              rating={5}
            />
            <Testimonial
              quote="The collaborative features and smart note-taking have made group projects much more efficient. It's amazing how the platform helps us work together seamlessly."
              author="Emma Thompson"
              role="Graduate Student"
              rating={5}
            />
          </div>
        </div>

        {/* CTA Card */}
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <div className="absolute inset-0 bg-grid-small opacity-20"></div>
            
            <div className="relative px-8 py-12 md:p-12">
              <div className="max-w-3xl mx-auto text-center text-white">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Start Your Learning Journey Today
                </h2>
                <p className="text-lg md:text-xl mb-8 text-white/90">
                  Join thousands of learners already experiencing the future of education. 
                  Get started with our AI-powered platform and transform the way you learn.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-indigo-600 font-medium hover:bg-white/90 transition-colors">
                    Try Moxium Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </button>
                  <button className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-white font-medium border-2 border-white/20 hover:bg-white/10 transition-colors">
                    Watch Demo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
