"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { toast } from "sonner";
import "@/styles/sketchy-elements.css";

import SketchyInputDecorator from "@/components/ui/sketchy-input-decorator";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (
      !formData.username ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.first_name ||
      !formData.last_name
    ) {
      toast.error("Please fill in all fields");
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
      });
      // Redirect is handled in the auth provider
    } catch (error) {
      // Error is handled in the auth provider
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden sketchy-black-bg">
      {/* Background grid */}
      <div className="sketchy-grid" />
      


      <div className="w-full max-w-md space-y-6 relative">
        <div className="text-center">
          <h2 className="mt-4 text-4xl font-mono font-medium text-white relative">
            Create Account
            <div className="absolute -inset-1 bg-gradient-to-br from-[#333] to-[#666] -z-10 transform translate-y-1 rounded-lg opacity-10" />
          </h2>
          <p className="mt-2 text-center text-gray-300 font-mono text-lg">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-white hover:text-gray-300 transition-colors relative group"
            >
              Sign in
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </Link>
          </p>
        </div>
        
        <div className="mt-6 bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200 overflow-y-auto max-h-[70vh]">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="first_name"
                  className="block font-mono text-lg font-medium text-[#333]"
                >
                  First Name
                </label>
                <div className="mt-1 relative">
                  <Input
                    id="first_name"
                    name="first_name"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={formData.first_name}
                    onChange={handleChange}
                    className="block w-full rounded-md border-2 border-[#333] shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] focus:border-[#333] transition-all duration-200 font-mono text-lg bg-white hover:bg-[#fafafa]"
                  />
                </div>
              </div>
              
              <div>
                <label
                  htmlFor="last_name"
                  className="block font-mono text-lg font-medium text-[#333]"
                >
                  Last Name
                </label>
                <div className="mt-1 relative">
                  <Input
                    id="last_name"
                    name="last_name"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={formData.last_name}
                    onChange={handleChange}
                    className="block w-full rounded-md border-2 border-[#333] shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] focus:border-[#333] transition-all duration-200 font-mono text-lg bg-white hover:bg-[#fafafa]"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label
                htmlFor="username"
                className="block font-mono text-lg font-medium text-[#333]"
              >
                Username
              </label>
              <div className="mt-1 relative">
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="block w-full rounded-md border-2 border-[#333] shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] focus:border-[#333] transition-all duration-200 font-mono text-lg bg-white hover:bg-[#fafafa]"
                />

              </div>
            </div>

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
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full rounded-md border-2 border-[#333] shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] focus:border-[#333] transition-all duration-200 font-mono text-lg bg-white hover:bg-[#fafafa]"
                  placeholder="you@example.com"
                />

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
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full rounded-md border-2 border-[#333] shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] focus:border-[#333] transition-all duration-200 font-mono text-lg bg-white hover:bg-[#fafafa]"
                  placeholder="••••••••"
                />

              </div>
              <p className="mt-1 font-mono text-sm text-[#666]">
                Password must be at least 8 characters long
              </p>
            </div>
            
            <div>
              <label
                htmlFor="confirmPassword"
                className="block font-mono text-lg font-medium text-[#333]"
              >
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="block w-full rounded-md border-2 border-[#333] shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] focus:border-[#333] transition-all duration-200 font-mono text-lg bg-white hover:bg-[#fafafa]"
                  placeholder="••••••••"
                />

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
                    Creating account...
                  </div>
                ) : (
                  "Create account"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
