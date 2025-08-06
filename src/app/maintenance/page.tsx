"use client";

import { Wrench, ShieldAlert, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
        <div className="text-center text-gray-600">Loading...</div>
      </div>
    );
  }

  // Maintenance page UI (similar to MaintenanceWrapper component)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full">
        <Card className="border-gray-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-amber-50 rounded-full">
                <Wrench className="h-12 w-12 text-amber-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Maintenance in Progress
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              We&apos;re currently performing scheduled maintenance on our platform. 
              We&apos;ll be back online shortly. Thank you for your patience!
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert className="border-amber-200 bg-amber-50">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Only administrators can access the platform during maintenance.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              {user ? (
                <Button
                  onClick={logout}
                  variant="outline"
                  className="w-full"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              ) : (
                <Button
                  asChild
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Link href="/auth/login">
                    Administrator Login
                  </Link>
                </Button>
              )}
              
              <Button
                asChild
                variant="outline"
                className="w-full"
              >
                <Link href="/waitlist">
                  Join Our Waitlist
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
