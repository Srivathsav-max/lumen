"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import "@/styles/sketchy-elements.css";
import { useRouter } from "next/navigation";
import * as registerApi from "./api";

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
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setUser } = useAuth();
  const router = useRouter();
  
  // Check if registration is enabled when the page loads
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const enabled = await registerApi.isRegistrationEnabled();
        setRegistrationEnabled(enabled);
      } catch (error) {
        console.error('Error checking registration status:', error);
        setRegistrationEnabled(false); // Default to disabled on error
      } finally {
        setIsLoading(false);
      }
    };
    
    checkRegistrationStatus();
  }, []);

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
      // Use the register API directly
      const data = await registerApi.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
      });
      
      // Update the auth context with the user data
      setUser(data.user);
      
      // Show success message
      toast.success("Registration successful");
      
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to register");
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
              href="/auth/login"
              className="font-medium text-white hover:text-gray-300 transition-colors relative group"
            >
              Sign in
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </Link>
          </p>
        </div>
        
        {/* Registration disabled message */}
        {!isLoading && registrationEnabled === false && (
          <div className="bg-yellow-100 border-2 border-[#333] rounded-lg p-4 shadow-[0_8px_0_0_#333] mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-bold font-mono text-[#333]">Registration Disabled</h3>
                <div className="mt-2 text-sm font-mono text-[#333]">
                  <p>
                    New user registration is currently disabled. Please check back later or contact support for assistance.
                  </p>
                </div>
                <div className="mt-4">
                  <Button
                    type="button"
                    className="w-full flex justify-center py-2 px-4 border-2 border-[#333] rounded-md shadow-[0_4px_0_0_#333] text-md font-medium font-mono text-[#333] bg-white hover:bg-[#fafafa] transition-all duration-200 transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333]"
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
          <div className="mt-6 bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#333]"></div>
          </div>
        ) : registrationEnabled ? (
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
        ) : null}
      </div>
    </div>
  );
}
