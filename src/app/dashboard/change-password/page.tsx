"use client";

import { useState, useRef, useEffect, memo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, type ChangePasswordFormData } from "@/lib/validation-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/providers/notification-provider";
import { useRouter } from "next/navigation";
import { KeyRound, AlertCircle, Shield, X } from "lucide-react";
import * as api from "./api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

// OTP Input component with individual boxes
function OtpInput({ value, onChange, length = 6 }: { value: string; onChange: (value: string) => void; length?: number }) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  useEffect(() => {
    // Initialize refs array
    inputRefs.current = Array(length).fill(null);
    
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [length]);
  
  useEffect(() => {
    const valueLength = value.length;
    if (valueLength < length && inputRefs.current[valueLength]) {
      inputRefs.current[valueLength].focus();
    }
  }, [value, length]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    
    
    if (val.length > 1) {
      const digits = val.split('').filter(char => /\d/.test(char));
      const newOtp = [...value.split('')]; 
      
      for (let i = 0; i < digits.length && index + i < length; i++) {
        newOtp[index + i] = digits[i];
      }
      
      const newValue = newOtp.join('');
      onChange(newValue);
      
      const nextIndex = Math.min(index + digits.length, length - 1);
      const nextInput = inputRefs.current[nextIndex];
      if (nextInput) {
        nextInput.focus();
      }
    } else {
      // Handle single digit input
      const newValue = [...value.split('')];
      if (val === '') {
        // Handle deletion
        newValue[index] = '';
      } else {
        // Handle new digit
        newValue[index] = val;
      }
      
      onChange(newValue.join(''));
      
      // Auto-focus next input if a digit was entered
      if (val !== '' && index < length - 1) {
        const nextInput = inputRefs.current[index + 1];
        if (nextInput) {
          nextInput.focus();
        }
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    const input = e.target as HTMLInputElement;
    const currentValue = input.value;
    
    // Handle backspace
    if (e.key === 'Backspace') {
      if (currentValue === '') {
        // If current input is empty, focus and clear previous input
        if (index > 0) {
          const prevInput = inputRefs.current[index - 1];
          if (prevInput) {
            prevInput.focus();
            
            // Clear the previous input's value in the state
            const newValue = [...value.split('')];
            newValue[index - 1] = '';
            onChange(newValue.join(''));
          }
        }
      } else {
        // Clear current input
        const newValue = [...value.split('')];
        newValue[index] = '';
        onChange(newValue.join(''));
      }
    }
    // Handle left arrow
    else if (e.key === 'ArrowLeft' && index > 0) {
      const prevInput = inputRefs.current[index - 1];
      if (prevInput) {
        prevInput.focus();
      }
    }
    // Handle right arrow
    else if (e.key === 'ArrowRight' && index < length - 1) {
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      }
    }
  };
  
  // Create array of digits from value
  const digits = value.split('').concat(Array(length - value.length).fill(''));
  
  return (
    <div className="flex justify-center space-x-2 my-4">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[index] || ''}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onFocus={(e) => e.target.select()}
          className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
        />
      ))}
    </div>
  );
}

const ChangePasswordPage = memo(function ChangePasswordPage() {
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    getValues
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });
  
  const requestOtp = async () => {
    const { currentPassword, newPassword, confirmPassword } = getValues();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields first");
      return;
    }
    
    // Validate password strength
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    
    setIsRequestingOtp(true);
    
    try {
      const message = await api.requestPasswordChangeOTP();
      toast.success(message || "OTP has been sent to your email");
      
      // Open the OTP dialog
      setOtpDialogOpen(true);
      // Reset OTP value when requesting a new one
      setOtp("");
    } catch (error) {
      console.error('OTP request error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to send OTP");
    } finally {
      setIsRequestingOtp(false);
    }
  };
  
  const onSubmit = async (data: ChangePasswordFormData) => {
    if (!otp) {
      toast.error("Please enter the OTP");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const message = await api.changePassword(data.currentPassword, data.newPassword, otp);
      toast.success(message || "Password has been changed successfully");
      
      // Close the OTP dialog if it's open
      setOtpDialogOpen(false);
      
      // Reset form state
      reset();
      setOtp("");
      
      // Redirect back to profile after successful password change
      router.push("/dashboard/profile");
    } catch (error) {
      console.error('Password change error:', error);
      
      // Handle specific error messages
      const errorMessage = error instanceof Error ? error.message : "Failed to change password";
      
      if (errorMessage.includes("Invalid or expired OTP")) {
        toast.error("Your verification code has expired. Please request a new one.");
        // Reset OTP field
        setOtp("");
        // Keep dialog open to allow requesting a new OTP
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account security and password</p>
      </div>
      
      {/* OTP Verification Dialog */}
      <Dialog open={otpDialogOpen} onOpenChange={(open) => {
        if (!isSubmitting) {
          setOtpDialogOpen(open);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <div className="absolute right-4 top-4">
            <button 
              onClick={() => setOtpDialogOpen(false)} 
              className="rounded-full p-1 hover:bg-gray-100 transition-colors focus:outline-none disabled:opacity-50"
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          
          <DialogHeader className="text-center">
            <div className="mb-2 font-bold text-xl text-blue-600">LUMEN</div>
            <DialogTitle className="text-xl font-bold">Verification Required</DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              Enter the 6-digit code sent to your email address
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 pt-2">
            <div className="flex flex-col items-center space-y-4">
              <OtpInput 
                value={otp} 
                onChange={setOtp} 
                length={6} 
              />
              
              <p className="text-sm text-gray-500">
                Didn&apos;t receive the code?{" "}
                <button 
                  type="button" 
                  onClick={requestOtp} 
                  disabled={isRequestingOtp}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {isRequestingOtp ? "Sending..." : "Resend"}
                </button>
              </p>
            </div>
            
            <div className="flex justify-between mt-6 gap-4">
              <Button 
                type="button" 
                onClick={() => setOtpDialogOpen(false)}
                disabled={isSubmitting}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={otp.length !== 6 || isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center w-full">
                    <Spinner size="sm" className="mr-2" />
                    Verifying...
                  </div>
                ) : (
                  "Verify & Change"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="max-w-2xl mx-auto">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <KeyRound className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  {...register("currentPassword")}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter your current password"
                />
                {errors.currentPassword && (
                  <p className="text-sm text-red-600">{errors.currentPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  {...register("newPassword")}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter your new password"
                />
                {errors.newPassword && (
                  <p className="text-sm text-red-600">{errors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  {...register("confirmPassword")}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Confirm your new password"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
              
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Password must be at least 8 characters long
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-end space-x-4 pt-4">
                <Button
                  type="button"
                  onClick={() => router.push("/dashboard/profile")}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={requestOtp}
                  disabled={isRequestingOtp || Object.keys(errors).length > 0 || !watch("currentPassword") || !watch("newPassword") || !watch("confirmPassword")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isRequestingOtp ? (
                    <>
                      <Spinner className="mr-2" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Verify Password Change
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default ChangePasswordPage;
