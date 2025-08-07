"use client";

import { toast as baseToast } from "@/hooks/use-toast";

// Enhanced toast with success and error methods for better UX
export const toast = {
  success: (message: string) => {
    baseToast({
      title: "Success",
      description: message,
      variant: "default",
    });
  },
  
  error: (message: string) => {
    baseToast({
      title: "Error", 
      description: message,
      variant: "destructive",
    });
  },
  
  // Re-export the base toast for other use cases
  ...baseToast,
};

export default toast;
