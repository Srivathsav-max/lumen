"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/providers/notification-provider";
import { useRouter } from "next/navigation";
import { KeyRound, AlertCircle, Shield, X } from "lucide-react";
import * as api from "./api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  
  // When value changes externally, focus on the appropriate input
  useEffect(() => {
    const valueLength = value.length;
    if (valueLength < length && inputRefs.current[valueLength]) {
      inputRefs.current[valueLength].focus();
    }
  }, [value, length]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    
    
    if (val.length > 1) {
      // If pasting multiple digits, distribute them across inputs
      const digits = val.split('').filter(char => /\d/.test(char));
      const newOtp = [...value.split('')]; 
      
      // Fill current and subsequent inputs
      for (let i = 0; i < digits.length && index + i < length; i++) {
        newOtp[index + i] = digits[i];
      }
      
      const newValue = newOtp.join('');
      onChange(newValue);
      
      // Focus appropriate input after paste
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
          className="w-12 h-14 text-center text-xl font-mono font-bold border-2 border-[#333] rounded-md shadow-[0_4px_0_0_#333] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200"
        />
      ))}
    </div>
  );
}

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  
  const router = useRouter();
  
  const requestOtp = async () => {
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword || !otp) {
      toast.error("Please fill in all fields including OTP");
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
    
    setIsSubmitting(true);
    
    try {
      const message = await api.changePassword(currentPassword, newPassword, otp);
      toast.success(message || "Password has been changed successfully");
      
      // Close the OTP dialog if it's open
      setOtpDialogOpen(false);
      
      // Reset form state
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
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
      <h1 className="text-2xl font-bold mb-6 font-mono text-[#333]">Security Settings</h1>
      
      {/* OTP Verification Dialog */}
      <Dialog open={otpDialogOpen} onOpenChange={(open) => {
        if (!isSubmitting) {
          setOtpDialogOpen(open);
        }
      }}>
        <DialogContent className="sm:max-w-md border-2 border-[#333] shadow-[0_8px_0_0_#333] p-0 bg-white">
          <div className="absolute right-4 top-4">
            <button 
              onClick={() => setOtpDialogOpen(false)} 
              className="rounded-full p-1 hover:bg-gray-100 transition-colors focus:outline-none disabled:opacity-50"
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          
          <DialogHeader className="px-6 pt-6">
            <div className="text-center mb-2 font-mono font-bold text-xl text-[#333]">LUMEN</div>
            <DialogTitle className="text-xl font-bold font-mono text-center text-[#333]">Verification Required</DialogTitle>
            <DialogDescription className="text-center font-mono text-gray-600 mt-2">
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
              
              <p className="text-sm text-gray-500 font-mono">
                Didn&apos;t receive the code?{" "}
                <button 
                  type="button" 
                  onClick={requestOtp} 
                  disabled={isRequestingOtp}
                  className="text-blue-600 hover:text-blue-800 underline font-mono"
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
                className="flex-1 font-mono border-2 border-[#333] shadow-[0_4px_0_0_#333] bg-white hover:bg-gray-100 text-[#333] transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e as React.FormEvent);
                }}
                disabled={otp.length !== 6 || isSubmitting}
                className="flex-1 font-mono border-2 border-[#333] shadow-[0_4px_0_0_#333] bg-blue-500 hover:bg-blue-600 text-white transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center w-full">
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
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
      
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-3 rounded-md mr-4">
              <KeyRound className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-mono text-[#333]">Change Password</h2>
              <p className="text-gray-600 font-mono text-sm">Update your account password</p>
            </div>
          </div>
          
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <div>
              <p className="text-sm text-gray-500 font-mono mb-1">Current Password</p>
              <Input
                id="current-password"
                name="current-password"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border-2 border-[#333] rounded-md p-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
                placeholder="Enter your current password"
              />
            </div>

            <div>
              <p className="text-sm text-gray-500 font-mono mb-1">New Password</p>
              <Input
                id="new-password"
                name="new-password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border-2 border-[#333] rounded-md p-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
                placeholder="Enter your new password"
              />
            </div>

            <div>
              <p className="text-sm text-gray-500 font-mono mb-1">Confirm New Password</p>
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border-2 border-[#333] rounded-md p-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
                placeholder="Confirm your new password"
              />
            </div>
            
            <div className="flex items-center text-sm text-amber-600 font-mono mt-2">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span>Password must be at least 8 characters long</span>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4">
              <Button
                type="button"
                onClick={() => router.push("/dashboard/profile")}
                className="font-mono border-2 border-[#333] shadow-[0_4px_0_0_#333] bg-white hover:bg-gray-100 text-[#333] transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={requestOtp}
                disabled={isRequestingOtp || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
                className="font-mono border-2 border-[#333] shadow-[0_4px_0_0_#333] bg-blue-500 hover:bg-blue-600 text-white transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200"
              >
                {isRequestingOtp ? (
                  <div className="flex items-center">
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                    Sending OTP...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Verify Password Change
                  </div>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
