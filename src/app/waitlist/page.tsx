"use client";
import React, { useState, memo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { waitlistSchema, type WaitlistFormData } from "@/lib/validation-schemas";
import { BackgroundLines } from "@/components/ui/background-lines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/providers/notification-provider";
import { Sparkles } from "lucide-react";
import * as waitlistApi from "./api";

const WaitlistPage = memo(function WaitlistPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      email: '',
      name: ''
    }
  });

  const onSubmit = useCallback(async (data: WaitlistFormData) => {
    setIsSubmitting(true);
    
    try {
      // Use the centralized waitlist API module
      await waitlistApi.joinWaitlist(data);
      
      toast.success("You've been added to the waitlist!");
      reset();
      setIsSuccess(true);
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join waitlist');
    } finally {
      setIsSubmitting(false);
    }
  }, [reset]);
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <BackgroundLines className="relative flex flex-col items-center justify-center antialiased overflow-hidden">
        <div className="max-w-2xl mx-auto p-4 relative z-10 mt-24">
          <h1 className="text-4xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-center font-sans font-bold mb-4">
            Join Our Waitlist
          </h1>
          <p className="text-gray-600 max-w-lg mx-auto my-6 text-lg md:text-xl text-center leading-relaxed">
            Be the first to know when we launch new features and get early access to our platform.
          </p>
          
          {isSuccess ? (
            <div className="bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200 max-w-md mx-auto">
              <div className="flex flex-col items-center text-center">
                <div className="bg-green-100 p-3 rounded-full mb-4">
                  <Sparkles className="h-8 w-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold font-mono text-[#333] mb-2">
                  Thank You!
                </h2>
                <p className="text-gray-600 font-mono">
                  You&apos;ve been added to our waitlist. We&apos;ll notify you when we have updates.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200 max-w-md mx-auto">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium font-mono text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    {...register("email")}
                    className={`w-full border-2 border-[#333] shadow-[0_2px_0_0_#333] font-mono ${
                      errors.email ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 font-mono">{errors.email.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium font-mono text-gray-700 mb-1">
                    Name (Optional)
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your Name"
                    {...register("name")}
                    className={`w-full border-2 border-[#333] shadow-[0_2px_0_0_#333] font-mono ${
                      errors.name ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600 font-mono">{errors.name.message}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full border-2 border-[#333] shadow-[0_4px_0_0_#333] font-mono text-white bg-purple-500 hover:bg-purple-600 transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200"
                >
                  {isSubmitting ? "Joining..." : "Join Waitlist"}
                </Button>
              </form>
            </div>
          )}
        </div>
      </BackgroundLines>
    </main>
  );
});

export default WaitlistPage;
