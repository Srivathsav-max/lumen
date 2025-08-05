"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validation-schemas";
import { useState, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { toast } from "@/providers/notification-provider";
import "@/styles/sketchy-elements.css";
import { useRouter } from "next/navigation";
import * as api from "./api";

const ForgotPasswordPage = memo(function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = useCallback(async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    
    try {
      const message = await api.requestPasswordReset(data.email);
      toast.success(message || "Password reset instructions sent to your email");
      setRequestSent(true);
    } catch (error) {
      console.error('Password reset request error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to request password reset");
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden sketchy-black-bg">
      {/* Background grid */}
      <div className="sketchy-grid" />
      
      <div className="w-full max-w-md space-y-6 relative">
        <div className="text-center">
          <h2 className="mt-4 text-4xl font-mono font-medium text-white relative">
            Forgot Password
            <div className="absolute -inset-1 bg-gradient-to-br from-[#333] to-[#666] -z-10 transform translate-y-1 rounded-lg opacity-10" />
          </h2>
          <p className="mt-2 text-center text-gray-300 font-mono text-lg">
            Remember your password?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-white hover:text-gray-300 transition-colors relative group"
            >
              Sign in
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#333] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </Link>
          </p>
        </div>
        
        <div className="mt-6 bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200 overflow-y-auto max-h-[70vh]">
          {requestSent ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-mono font-medium text-[#333]">Check Your Email</h3>
              <p className="text-gray-600 font-mono">
                We&apos;ve sent password reset instructions to <span className="font-semibold">{getValues('email')}</span>
              </p>
              <p className="text-gray-600 font-mono text-sm">
                If you don&apos;t see the email in your inbox, check your spam folder.
              </p>
              <div className="pt-4">
                <Button
                  onClick={() => router.push('/auth/login')}
                  className="w-full flex justify-center py-3 px-4 border-2 border-[#333] rounded-md shadow-[0_8px_0_0_#333] text-lg font-medium font-mono text-[#333] bg-white hover:bg-[#fafafa] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#333] transition-all duration-200 transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] active:translate-y-1 active:shadow-[0_4px_0_0_#333]"
                >
                  Return to Login
                </Button>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label
                  htmlFor="email"
                  className="block font-mono text-lg font-medium text-[#333]"
                >
                  Email address
                </label>
                <div className="mt-1 relative">
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register("email")}
                    className={`block w-full rounded-md border-2 shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] transition-all duration-200 font-mono text-lg bg-white hover:bg-[#fafafa] ${
                      errors.email ? 'border-red-500' : 'border-[#333] focus:border-[#333]'
                    }`}
                    placeholder="you@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 font-mono">{errors.email.message}</p>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-500 font-mono">
                  We&apos;ll send a password reset link to this email
                </p>
              </div>

              <div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-3 px-4 border-2 border-[#333] rounded-md shadow-[0_8px_0_0_#333] text-lg font-medium font-mono text-[#333] bg-white hover:bg-[#fafafa] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#333] transition-all duration-200 transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] active:translate-y-1 active:shadow-[0_4px_0_0_#333]"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin mr-2 h-5 w-5 border-2 border-[#333] border-t-transparent rounded-full"></div>
                      Sending...
                    </div>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
});

export default ForgotPasswordPage;
