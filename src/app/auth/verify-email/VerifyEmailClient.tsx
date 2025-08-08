"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { emailVerificationRequestSchema, type EmailVerificationRequestFormData } from "@/lib/validation-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { toast } from "@/providers/notification-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/ios-spinner";
import * as api from "./api";

export default function VerifyEmailClient() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [token, setToken] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<EmailVerificationRequestFormData>({
    resolver: zodResolver(emailVerificationRequestSchema),
    defaultValues: {
      email: ''
    }
  });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Get token from URL query parameter
    const tokenParam = searchParams?.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      verifyEmailWithToken(tokenParam);
    }
  }, [searchParams]);

  const verifyEmailWithToken = async (verificationToken: string) => {
    setIsVerifying(true);
    
    try {
      const message = await api.verifyEmail(verificationToken);
      toast.success(message || "Email verified successfully");
      setVerificationComplete(true);
    } catch (error) {
      console.error('Email verification error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to verify email");
      setVerificationFailed(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const onSubmitVerificationRequest = async (data: EmailVerificationRequestFormData) => {
    setIsRequesting(true);
    
    try {
      const message = await api.requestVerification(data.email);
      toast.success(message || "Verification email sent");
      setSubmittedEmail(data.email);
      setRequestSent(true);
    } catch (error) {
      console.error('Request verification error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to request verification email");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden sketchy-black-bg">
      {/* Background grid */}
      <div className="sketchy-grid" />
      
      <div className="w-full max-w-md space-y-6 relative">
        <div className="text-center">
          <h2 className="mt-4 text-4xl font-mono font-medium text-white relative">
            Email Verification
            <div className="absolute -inset-1 bg-gradient-to-br from-[#333] to-[#666] -z-10 transform translate-y-1 rounded-lg opacity-10" />
          </h2>
          <p className="mt-2 text-center text-gray-300 font-mono text-lg">
            Verify your email address to access all features
          </p>
        </div>
        
        <div className="mt-6 bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200 overflow-y-auto max-h-[70vh]">
          {isVerifying ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex items-center justify-center">
                <Spinner size="lg" />
              </div>
              <h3 className="text-xl font-mono font-medium text-[#333]">Verifying Your Email</h3>
              <p className="text-gray-600 font-mono">
                Please wait while we verify your email address...
              </p>
            </div>
          ) : verificationComplete ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-mono font-medium text-[#333]">Email Verified</h3>
              <p className="text-gray-600 font-mono">
                Your email has been verified successfully. You can now access all features.
              </p>
              <div className="pt-4">
                <Button
                  onClick={() => router.push('/auth/login')}
                  className="w-full flex justify-center py-3 px-4 border-2 border-[#333] rounded-md shadow-[0_8px_0_0_#333] text-lg font-medium font-mono text-[#333] bg-white hover:bg-[#fafafa] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#333] transition-all duration-200 transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] active:translate-y-1 active:shadow-[0_4px_0_0_#333]"
                >
                  Sign In
                </Button>
              </div>
            </div>
          ) : verificationFailed ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="mt-4 text-xl font-mono font-medium text-[#333]">Verification Failed</h3>
                <p className="mt-2 text-gray-600 font-mono">
                  The verification link is invalid or has expired.
                </p>
              </div>
              
              {requestSent ? (
                <div className="space-y-6 text-center">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-mono font-medium text-[#333]">Verification Email Sent</h3>
                  <p className="text-gray-600 font-mono">
                    We&apos;ve sent a new verification email to <span className="font-semibold">{submittedEmail}</span>
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
                <form className="space-y-6" onSubmit={handleSubmit(onSubmitVerificationRequest)}>
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
                        className={`block w-full rounded-md border-2 border-[#333] shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] focus:border-[#333] transition-all duration-200 font-mono text-lg bg-white hover:bg-[#fafafa] ${
                          errors.email ? 'border-red-500' : ''
                        }`}
                        placeholder="you@example.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600 font-mono">{errors.email.message}</p>
                    )}
                    <p className="mt-2 text-sm text-gray-500 font-mono">
                      Enter your email to request a new verification link
                    </p>
                  </div>

                  <div>
                    <Button
                      type="submit"
                      disabled={isRequesting}
                      className="w-full flex justify-center py-3 px-4 border-2 border-[#333] rounded-md shadow-[0_8px_0_0_#333] text-lg font-medium font-mono text-[#333] bg-white hover:bg-[#fafafa] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#333] transition-all duration-200 transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] active:translate-y-1 active:shadow-[0_4px_0_0_#333]"
                    >
                      {isRequesting ? (
                        <div className="flex items-center">
                          <Spinner size="sm" className="mr-2" />
                          Sending...
                        </div>
                      ) : (
                        "Send Verification Email"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : token ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex items-center justify-center">
                <Spinner size="lg" />
              </div>
              <h3 className="text-xl font-mono font-medium text-[#333]">Verifying Your Email</h3>
              <p className="text-gray-600 font-mono">
                Please wait while we verify your email address...
              </p>
            </div>
          ) : (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-mono font-medium text-[#333]">No Verification Token</h3>
              <p className="text-gray-600 font-mono">
                No verification token was provided. Please check your email for the verification link or request a new one.
              </p>
              
              {requestSent ? (
                <div className="space-y-6 text-center">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-mono font-medium text-[#333]">Verification Email Sent</h3>
                  <p className="text-gray-600 font-mono">
                    We&apos;ve sent a verification email to <span className="font-semibold">{submittedEmail}</span>
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
                <form className="space-y-6" onSubmit={handleSubmit(onSubmitVerificationRequest)}>
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
                        className={`block w-full rounded-md border-2 border-[#333] shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] focus:border-[#333] transition-all duration-200 font-mono text-lg bg-white hover:bg-[#fafafa] ${
                          errors.email ? 'border-red-500' : ''
                        }`}
                        placeholder="you@example.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600 font-mono">{errors.email.message}</p>
                    )}
                    <p className="mt-2 text-sm text-gray-500 font-mono">
                      Enter your email to request a verification link
                    </p>
                  </div>

                  <div>
                    <Button
                      type="submit"
                      disabled={isRequesting}
                      className="w-full flex justify-center py-3 px-4 border-2 border-[#333] rounded-md shadow-[0_8px_0_0_#333] text-lg font-medium font-mono text-[#333] bg-white hover:bg-[#fafafa] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#333] transition-all duration-200 transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] active:translate-y-1 active:shadow-[0_4px_0_0_#333]"
                    >
                      {isRequesting ? (
                        <div className="flex items-center">
                          <Spinner size="sm" className="mr-2" />
                          Sending...
                        </div>
                      ) : (
                        "Send Verification Email"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}