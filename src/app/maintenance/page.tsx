"use client";

import { Wrench, ShieldAlert, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import * as loginApi from '@/app/auth/login/api';
import { useAuth } from '@/hooks/use-auth';

export default function MaintenancePage() {
  const [isInMaintenance, setIsInMaintenance] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { logout, user } = useAuth();

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        setIsLoading(true);
        
        // Use the maintenance check from login API
        const maintenanceEnabled = await loginApi.isInMaintenanceMode();
        
        setIsInMaintenance(maintenanceEnabled);
        
        // If not in maintenance mode, redirect to dashboard
        if (!maintenanceEnabled) {
          window.location.href = '/dashboard';
        }
      } catch (err) {
        console.error('Error checking maintenance status:', err);
        // Default to maintenance mode if we can't check
        setIsInMaintenance(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkMaintenanceStatus();
  }, []);

  // If still loading, render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  // Maintenance page UI (similar to MaintenanceWrapper component)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-amber-100 p-4 rounded-full">
            <Wrench className="h-12 w-12 text-amber-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold font-mono text-[#333] mb-2">
          Maintenance in Progress
        </h1>
        
        <p className="text-gray-600 font-mono mb-6">
          We&apos;re currently performing scheduled maintenance on our platform. 
          We&apos;ll be back online shortly. Thank you for your patience!
        </p>
        
        <div className="flex items-center justify-center text-sm text-amber-600 font-mono mb-6">
          <ShieldAlert className="h-4 w-4 mr-2" />
          <span>Only administrators can access the platform during maintenance.</span>
        </div>
        
        <div className="space-y-4">
          {user ? (
            <Button
              onClick={logout}
              className="w-full bg-white text-[#333] border-2 border-[#333] shadow-[0_4px_0_0_#333] hover:shadow-[0_6px_0_0_#333] hover:-translate-y-1 transition-all duration-200 font-mono flex items-center justify-center"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          ) : (
            <Button
              asChild
              className="w-full bg-white text-[#333] border-2 border-[#333] shadow-[0_4px_0_0_#333] hover:shadow-[0_6px_0_0_#333] hover:-translate-y-1 transition-all duration-200 font-mono"
            >
              <Link href="/auth/login">
                Administrator Login
              </Link>
            </Button>
          )}
          
          <Button
            asChild
            variant="outline"
            className="w-full border-2 border-[#333] shadow-[0_4px_0_0_#333] hover:shadow-[0_6px_0_0_#333] hover:-translate-y-1 transition-all duration-200 font-mono"
          >
            <Link href="/waitlist">
              Join Our Waitlist
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
