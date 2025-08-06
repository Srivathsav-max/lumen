"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { emailVerificationRequestSchema, type EmailVerificationRequestFormData } from "@/lib/validation-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { toast } from "@/providers/notification-provider";
import { CheckCircle, X, AlertTriangle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
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
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-gray-50">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Email Verification
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Verify your email address to access all features
          </p>
        </div>
        
        <Card>
          {isVerifying ? (
            <CardContent className="space-y-6 text-center">
              <div className="mx-auto flex items-center justify-center">
                <Spinner size="lg" />
              </div>
              <CardTitle className="text-xl">Verifying Your Email</CardTitle>
              <CardDescription>
                Please wait while we verify your email address...
              </CardDescription>
            </CardContent>
          ) : verificationComplete ? (
            <CardContent className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">Email Verified</CardTitle>
              <CardDescription>
                Your email has been verified successfully. You can now access all features.
              </CardDescription>
              <Button
                onClick={() => router.push('/auth/login')}
                className="w-full"
              >
                Sign In
              </Button>
            </CardContent>
          ) : verificationFailed ? (
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <X className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-xl">Verification Failed</CardTitle>
                <CardDescription>
                  The verification link is invalid or has expired.
                </CardDescription>
              </div>
              
              {requestSent ? (
                <div className="space-y-6 text-center">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <CardTitle className="text-xl">Verification Email Sent</CardTitle>
                  <CardDescription>
                    We&apos;ve sent a new verification email to <span className="font-semibold">{submittedEmail}</span>
                  </CardDescription>
                  <CardDescription className="text-sm">
                    If you don&apos;t see the email in your inbox, check your spam folder.
                  </CardDescription>
                  <Button
                    onClick={() => router.push('/auth/login')}
                    className="w-full"
                  >
                    Return to Login
                  </Button>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleSubmit(onSubmitVerificationRequest)}>
                  <div>
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      {...register("email")}
                      placeholder="you@example.com"
                    />
                    {errors.email && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{errors.email.message}</AlertDescription>
                      </Alert>
                    )}
                    <p className="mt-2 text-sm text-muted-foreground">
                      Enter your email to request a new verification link
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isRequesting}
                    className="w-full"
                  >
                    {isRequesting ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Sending...
                      </>
                    ) : (
                      "Send Verification Email"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          ) : token ? (
            <CardContent className="space-y-6 text-center">
              <div className="mx-auto flex items-center justify-center">
                <Spinner size="lg" />
              </div>
              <CardTitle className="text-xl">Verifying Your Email</CardTitle>
              <CardDescription>
                Please wait while we verify your email address...
              </CardDescription>
            </CardContent>
          ) : (
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
                <CardTitle className="text-xl">No Verification Token</CardTitle>
                <CardDescription>
                  No verification token was provided. Please check your email for the verification link or request a new one.
                </CardDescription>
              </div>
              
              {requestSent ? (
                <div className="space-y-6 text-center">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <CardTitle className="text-xl">Verification Email Sent</CardTitle>
                  <CardDescription>
                    We&apos;ve sent a verification email to <span className="font-semibold">{submittedEmail}</span>
                  </CardDescription>
                  <CardDescription className="text-sm">
                    If you don&apos;t see the email in your inbox, check your spam folder.
                  </CardDescription>
                  <Button
                    onClick={() => router.push('/auth/login')}
                    className="w-full"
                  >
                    Return to Login
                  </Button>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleSubmit(onSubmitVerificationRequest)}>
                  <div>
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      {...register("email")}
                      placeholder="you@example.com"
                    />
                    {errors.email && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{errors.email.message}</AlertDescription>
                      </Alert>
                    )}
                    <p className="mt-2 text-sm text-muted-foreground">
                      Enter your email to request a verification link
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isRequesting}
                    className="w-full"
                  >
                    {isRequesting ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Sending...
                      </>
                    ) : (
                      "Send Verification Email"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}