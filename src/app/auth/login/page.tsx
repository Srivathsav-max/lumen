"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { toast } from "@/providers/notification-provider";
import "@/styles/sketchy-elements.css";
import { useRouter } from "next/navigation";
import * as loginApi from "./api";
import { loginSchema, type LoginFormData } from "@/lib/validation-schemas";
import { memo } from "react";

const LoginPage = memo(function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);      
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to login");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden sketchy-black-bg">
      {/* Background grid */}
      <div className="sketchy-grid" />
      


      <div className="w-full max-w-md space-y-6 relative">
        <div className="text-center">
          <h2 className="mt-4 text-4xl font-mono font-medium text-white relative">
            Welcome Back
            <div className="absolute -inset-1 bg-gradient-to-br from-[#333] to-[#666] -z-10 transform translate-y-1 rounded-lg opacity-10" />
          </h2>
          <p className="mt-2 text-center text-gray-300 font-mono text-lg">
            Or{" "}
            <Link
              href="/auth/register"
              className="font-medium text-white hover:text-gray-300 transition-colors relative group"
            >
              create a new account
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#333] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </Link>
          </p>
        </div>
        
        <div className="mt-6 bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200 overflow-y-auto max-h-[70vh]">
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
            </div>

            <div>
              <label
                htmlFor="password"
                className="block font-mono text-lg font-medium text-[#333]"
              >
                Password
              </label>
              <div className="mt-1 relative">
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
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
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-5 w-5 rounded border-2 border-[#333] text-[#333] focus:ring-[#333] shadow-[0_2px_0_0_#333]"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block font-mono text-lg text-[#333]"
                >
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  href="/auth/forgot-password"
                  className="font-mono text-lg font-medium text-[#333] hover:text-[#666] transition-colors relative group"
                >
                  Forgot password?
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#333] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </Link>
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
                    Signing in...
                  </div>
                ) : (
                  "Sign in"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

export default LoginPage;
