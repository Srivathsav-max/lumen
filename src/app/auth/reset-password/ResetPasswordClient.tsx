"use client";

import { useState, useEffect, memo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/validation-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { toast } from "@/providers/notification-provider";
import "@/styles/sketchy-elements.css";
import { useRouter, useSearchParams } from "next/navigation";
import * as api from "./api";

const ResetPasswordClient = memo(function ResetPasswordClient() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [token, setToken] = useState("");
  const [tokenValid, setTokenValid] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Get token from URL query parameter
    const tokenParam = searchParams?.get('token');
    if (!tokenParam) {
      setTokenValid(false);
      toast.error("Invalid or missing reset token");
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const onSubmit = useCallback(async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);
    
    try {
      const message = await api.resetPassword(token, data.password);
      toast.success(message || "Password has been reset successfully");
      setResetComplete(true);
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden sketchy-black-bg">
      {/* Background grid */}
      <div className="sketchy-grid" />
      
      <div className="w-full max-w-md space-y-6 relative">
        <div className="text-center">
          <h2 className="mt-4 text-4xl font-mono font-medium text-white relative">
            Reset Password
            <div className="absolute -inset-1 bg-gradient-to-br from-[#333] to-[#666] -z-10 transform translate-y-1 rounded-lg opacity-10" />
          </h2>
          <p className="mt-2 text-center text-gray-300 font-mono text-lg">
            Set a new password for your account
          </p>
        </div>
        
        <div className="mt-6 bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200 overflow-y-auto max-h-[70vh]">
          {!tokenValid ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-mono font-medium text-[#333]">Invalid Reset Link</h3>
              <p className="text-gray-600 font-mono">
                The password reset link is invalid or has expired.
              </p>
              <div className="pt-4">
                <Button
                  onClick={() => router.push('/auth/forgot-password')}
                  className="w-full flex justify-center py-3 px-4 border-2 border-[#333] rounded-md shadow-[0_8px_0_0_#333] text-lg font-medium font-mono text-[#333] bg-white hover:bg-[#fafafa] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#333] transition-all duration-200 transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] active:translate-y-1 active:shadow-[0_4px_0_0_#333]"
                >
                  Request New Reset Link
                </Button>
              </div>
            </div>
          ) : resetComplete ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-mono font-medium text-[#333]">Password Reset Complete</h3>
              <p className="text-gray-600 font-mono">
                Your password has been reset successfully.
              </p>
              <div className="pt-4">
                <Button
                  onClick={() => router.push('/auth/login')}
                  className="w-full flex justify-center py-3 px-4 border-2 border-[#333] rounded-md shadow-[0_8px_0_0_#333] text-lg font-medium font-mono text-[#333] bg-white hover:bg-[#fafafa] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#333] transition-all duration-200 transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] active:translate-y-1 active:shadow-[0_4px_0_0_#333]"
                >
                  Sign In with New Password
                </Button>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label
                  htmlFor="new-password"
                  className="block font-mono text-lg font-medium text-[#333]"
                >
                  New Password
                </label>
                <div className="mt-1 relative">
                  <Input
                    id="new-password"
                    type="password"
                    {...register("password")}
                    className={`block w-full rounded-md border-2 shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] transition-all duration-200 font-mono text-lg bg-white hover:bg-[#fafafa] ${
                      errors.password ? 'border-red-500' : 'border-[#333] focus:border-[#333]'
                    }`}
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 font-mono">{errors.password.message}</p>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-500 font-mono">
                  At least 8 characters
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block font-mono text-lg font-medium text-[#333]"
                >
                  Confirm New Password
                </label>
                <div className="mt-1 relative">
                  <Input
                    id="confirm-password"
                    type="password"
                    {...register("confirmPassword")}
                    className={`block w-full rounded-md border-2 shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] transition-all duration-200 font-mono text-lg bg-white hover:bg-[#fafafa] ${
                      errors.confirmPassword ? 'border-red-500' : 'border-[#333] focus:border-[#333]'
                    }`}
                    placeholder="••••••••"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600 font-mono">{errors.confirmPassword.message}</p>
                  )}
                </div>
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
                      Resetting...
                    </div>
                  ) : (
                    "Reset Password"
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

export default ResetPasswordClient;