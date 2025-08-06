"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validation-schemas";
import { useState, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Spinner } from '@/components/ui/spinner';
import { toast } from "@/providers/notification-provider";
import { CheckCircle } from "lucide-react";
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
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-gray-50">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Forgot Password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Remember your password?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
        
        <Card>
          {requestSent ? (
            <CardContent className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">Check Your Email</CardTitle>
              <CardDescription className="space-y-2">
                <p>
                  We&apos;ve sent password reset instructions to <span className="font-semibold">{getValues('email')}</span>
                </p>
                <p className="text-sm">
                  If you don&apos;t see the email in your inbox, check your spam folder.
                </p>
              </CardDescription>
              <Button
                onClick={() => router.push('/auth/login')}
                className="w-full"
              >
                Return to Login
              </Button>
            </CardContent>
          ) : (
            <CardContent>
              <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register("email")}
                    className={errors.email ? 'border-red-500' : ''}
                    placeholder="you@example.com"
                  />
                  {errors.email && (
                    <Alert variant="destructive">
                      <AlertDescription>{errors.email.message}</AlertDescription>
                    </Alert>
                  )}
                  <p className="text-sm text-gray-500">
                    We&apos;ll send a password reset link to this email
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
});

export default ForgotPasswordPage;
