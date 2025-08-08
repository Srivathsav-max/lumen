"use client";

import { useState, useEffect, memo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, GalleryVerticalEnd } from "lucide-react";
import { useRouter } from "next/navigation";
import * as registerApi from "./api";
import { registerSchema, type RegisterFormData } from "@/lib/validation-schemas";
import { Spinner } from "@/components/ui/ios-spinner";

const RegisterPage = memo(function RegisterPage() {
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });
  
  // Check if registration is enabled when the page loads
  const checkRegistrationStatus = useCallback(async () => {
    try {
      const enabled = await registerApi.isRegistrationEnabled();
      setRegistrationEnabled(enabled);
    } catch (error) {
      console.error('Error checking registration status:', error);
      setRegistrationEnabled(false);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    checkRegistrationStatus();
  }, [checkRegistrationStatus]);

  const onSubmit = useCallback(async (data: RegisterFormData) => {
    try {
      // Use the register API directly
      const result = await registerApi.register({
        username: data.username,
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
      });
      
      // Update the auth context with the user data
      setUser(result.user);
      
      // Show success message
      toast({
        title: "Success",
        description: "Registration successful",
      });
      
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to register",
        variant: "destructive",
      });
    }
  }, [setUser, router]);

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
            {/* Registration disabled message */}
            {!isLoading && registrationEnabled === false && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Registration Disabled</h3>
                    <div className="mt-1 text-sm text-yellow-700">
                      <p>New user registration is currently disabled.</p>
                    </div>
                    <div className="mt-3">
                      <Button
                        type="button"
                        className="w-full"
                        onClick={() => window.location.href = '/auth/login'}
                      >
                        Go to Login
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Spinner size="lg" />
              </div>
            ) : registrationEnabled ? (
              <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Create your account</h1>
                  <p className="text-balance text-sm text-muted-foreground">
                    Enter your details below to create your account
                  </p>
                </div>
                <div className="grid gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input 
                        id="first_name" 
                        type="text" 
                        placeholder="John" 
                        autoComplete="given-name"
                        {...register("first_name")}
                        className={errors.first_name ? 'border-red-500' : ''}
                      />
                      {errors.first_name && (
                        <p className="text-sm text-red-600">{errors.first_name.message}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input 
                        id="last_name" 
                        type="text" 
                        placeholder="Doe" 
                        autoComplete="family-name"
                        {...register("last_name")}
                        className={errors.last_name ? 'border-red-500' : ''}
                      />
                      {errors.last_name && (
                        <p className="text-sm text-red-600">{errors.last_name.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      type="text" 
                      placeholder="johndoe" 
                      autoComplete="username"
                      {...register("username")}
                      className={errors.username ? 'border-red-500' : ''}
                    />
                    {errors.username && (
                      <p className="text-sm text-red-600">{errors.username.message}</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="john@example.com" 
                      autoComplete="email"
                      {...register("email")}
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      autoComplete="new-password"
                      {...register("password")}
                      className={errors.password ? 'border-red-500' : ''}
                    />
                    {errors.password && (
                      <p className="text-sm text-red-600">{errors.password.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 8 characters long
                    </p>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      autoComplete="new-password"
                      {...register("confirmPassword")}
                      className={errors.confirmPassword ? 'border-red-500' : ''}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <Spinner size="sm" className="mr-2" />
                        Creating account...
                      </div>
                    ) : (
                      "Create account"
                    )}
                  </Button>
                  
                  <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                    <span className="relative z-10 bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                  
                  <Button variant="outline" className="w-full">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                        fill="currentColor"
                      />
                    </svg>
                    Sign up with GitHub
                  </Button>
                </div>
                <div className="text-center text-sm">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="underline underline-offset-4">
                    Sign in
                  </Link>
                </div>
              </form>
            ) : null}
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

export default RegisterPage;