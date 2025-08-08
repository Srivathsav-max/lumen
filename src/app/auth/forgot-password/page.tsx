"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validation-schemas";
import { useState, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Spinner } from '@/components/ui/ios-spinner';
import { toast } from "@/providers/notification-provider";
import { useRouter } from "next/navigation";
import { GalleryVerticalEnd, CheckCircle } from "lucide-react";
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
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/dashboard" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Lumen
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            {requestSent ? (
              <div className="flex flex-col gap-6 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h1 className="text-2xl font-bold">Check your email</h1>
                  <p className="text-balance text-sm text-muted-foreground">
                    We&apos;ve sent password reset instructions to{" "}
                    <span className="font-semibold">{getValues('email')}</span>
                  </p>
                </div>
                <div className="grid gap-4">
                  <p className="text-sm text-muted-foreground">
                    If you don&apos;t see the email in your inbox, check your spam folder.
                  </p>
                  <Button
                    onClick={() => router.push('/auth/login')}
                    className="w-full"
                  >
                    Return to Login
                  </Button>
                </div>
              </div>
            ) : (
              <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Forgot your password?</h1>
                  <p className="text-balance text-sm text-muted-foreground">
                    Enter your email below and we&apos;ll send you a reset link
                  </p>
                </div>
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="m@example.com" 
                      autoComplete="email"
                      {...register("email")}
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600">{errors.email.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll send a password reset link to this email
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <Spinner size="sm" className="mr-2" />
                        Sending...
                      </div>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </div>
                <div className="text-center text-sm">
                  Remember your password?{" "}
                  <Link href="/auth/login" className="underline underline-offset-4">
                    Sign in
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src="/image.png"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
});

export default ForgotPasswordPage;