"use client";

import { useEffect, useState, memo, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { testEmailSchema, type TestEmailFormData } from "@/lib/validation-schemas";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { NotFound } from "@/components/ui/not-found";
import { AlertCircle, Lock, Mail, Settings, Shield, Users, Wrench } from "lucide-react";
import { toast } from "@/providers/notification-provider";
import * as settingsApi from "./api";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/ios-spinner";

// Import the SystemSetting interface from the API
import { SystemSetting } from './api';

const SettingsPage = memo(function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TestEmailFormData>({
    resolver: zodResolver(testEmailSchema),
    defaultValues: {
      to: '',
      subject: 'Test Email from Lumen',
      message: 'This is a test email to verify the email service is working correctly.'
    }
  });
  // Password functionality moved to dedicated change-password page

  // No longer need to get token from cookies as the API client handles this

  // Check if user is admin or developer - memoized for performance
  const isAdminOrDeveloper = useMemo(() => 
    user?.is_admin || user?.roles?.includes('admin') || user?.roles?.includes('developer'),
    [user?.is_admin, user?.roles]
  );

  useEffect(() => {
    if (isAdminOrDeveloper) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [isAdminOrDeveloper]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Use the settings API module
      const settings = await settingsApi.getAllSystemSettings();
      setSettings(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load settings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      setUpdating(true);
      
      // Use the settings API module
      await settingsApi.updateSystemSetting(key, value);
      
      // Update local state
      setSettings(prev => 
        prev.map(setting => 
          setting.key === key ? { ...setting, value } : setting
        )
      );

      toast.success('Setting updated successfully');
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update setting. Please try again later.');
    } finally {
      setUpdating(false);
    }
  };

  const toggleRegistration = async (enabled: boolean) => {
    try {
      setUpdating(true);
      
      // Use the settings API module
      await settingsApi.toggleRegistration(enabled);
      
      // Update local state
      setSettings(prev => 
        prev.map(setting => 
          setting.key === 'registration_enabled' ? { ...setting, value: String(enabled) } : setting
        )
      );
      
      // Show a specific toast message for registration toggle
      toast.success(`User registration has been ${enabled ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      console.error('Error toggling registration:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to toggle registration. Please try again later.');
    } finally {
      setUpdating(false);
    }
  };



  // Password change functionality moved to dedicated change-password page

  const onSubmitTestEmail = async (data: TestEmailFormData) => {
    try {
      setSendingEmail(true);
      const message = await settingsApi.sendTestEmail(data);
      toast.success(message || 'Test email sent successfully');
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send test email. Please try again later.');
    } finally {
      setSendingEmail(false);
    }
  };

  // Password change functionality moved to dedicated change-password page

  // If user is not admin or developer, show not found page
  if (!isAdminOrDeveloper) {
    return (
      <NotFound 
        title="Access Denied"
        description="You don't have permission to access this page."
        backUrl="/dashboard"
        backLabel="Back to Dashboard"
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const registrationEnabled = settings.find(s => s.key === 'registration_enabled')?.value === 'true';
  const maintenanceMode = settings.find(s => s.key === 'maintenance_mode')?.value === 'true';

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-mono text-[#333] mb-2">
              System Settings
            </h1>
            <p className="text-gray-600 font-mono">
              Manage platform-wide settings and configurations
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button className="border-2 border-[#333] shadow-[0_4px_0_0_#333] font-mono text-[#333] bg-white hover:bg-[#fafafa] transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200">
              <Settings className="mr-2 h-4 w-4" />
              Settings Guide
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registration Settings */}
        <div className="bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-3 rounded-md mr-4">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-mono text-[#333]">User Registration</h2>
              <p className="text-gray-600 font-mono text-sm">Control new user sign-ups</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium font-mono">Allow New Registrations</p>
                <p className="text-sm text-gray-500 font-mono">
                  {registrationEnabled 
                    ? "New users can create accounts" 
                    : "New user registration is disabled"}
                </p>
              </div>
              <Button
                onClick={() => toggleRegistration(!registrationEnabled)}
                disabled={updating}
                className={`font-mono border-2 border-[#333] shadow-[0_4px_0_0_#333] transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200 ${
                  registrationEnabled 
                    ? "bg-red-500 hover:bg-red-600 text-white" 
                    : "bg-green-500 hover:bg-green-600 text-white"
                }`}
              >
                {registrationEnabled ? "Disable Registration" : "Enable Registration"}
              </Button>
            </div>
            
            <div className="flex items-center text-sm text-amber-600 font-mono">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span>Changes take effect immediately</span>
            </div>
          </div>
        </div>
        
        {/* Maintenance Mode Settings */}
        <div className="bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200">
          <div className="flex items-center mb-4">
            <div className="bg-yellow-100 p-3 rounded-md mr-4">
              <Wrench className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-mono text-[#333]">Maintenance Mode</h2>
              <p className="text-gray-600 font-mono text-sm">Control system access</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium font-mono">Maintenance Mode</p>
                <p className="text-sm text-gray-500 font-mono">
                  {maintenanceMode 
                    ? "Site is in maintenance mode" 
                    : "Site is operating normally"}
                </p>
              </div>
              <Button
                onClick={() => updateSetting('maintenance_mode', String(!maintenanceMode))}
                disabled={updating}
                className={`font-mono border-2 border-[#333] shadow-[0_4px_0_0_#333] transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200 ${
                  maintenanceMode 
                    ? "bg-green-500 hover:bg-green-600 text-white" 
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
              >
                {maintenanceMode ? "Disable Maintenance" : "Enable Maintenance"}
              </Button>
            </div>
            
            <div className="flex items-center text-sm text-amber-600 font-mono">
              <Shield className="h-4 w-4 mr-2" />
              <span>Only admins and developers can access in maintenance mode</span>
            </div>
          </div>
        </div>
        

        
        {/* Email Testing */}
        <div className="bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200">
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 p-3 rounded-md mr-4">
              <Mail className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-mono text-[#333]">Email Testing</h2>
              <p className="text-gray-600 font-mono text-sm">Verify email functionality</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit(onSubmitTestEmail)} className="space-y-4">
            <div>
              <p className="font-medium font-mono mb-2">Send Test Email</p>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 font-mono mb-1">Recipient Email</p>
                  <Input
                    type="email"
                    {...register("to")}
                    placeholder="recipient@example.com"
                    className={`w-full border-2 border-[#333] rounded-md p-2 font-mono focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-500 ${
                      errors.to ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.to && (
                    <p className="mt-1 text-sm text-red-600 font-mono">{errors.to.message}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-mono mb-1">Subject</p>
                  <Input
                    type="text"
                    {...register("subject")}
                    placeholder="Test Email Subject"
                    className={`w-full border-2 border-[#333] rounded-md p-2 font-mono focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-500 ${
                      errors.subject ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.subject && (
                    <p className="mt-1 text-sm text-red-600 font-mono">{errors.subject.message}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-mono mb-1">Message</p>
                  <Input
                    type="text"
                    {...register("message")}
                    placeholder="Test email message"
                    className={`w-full border-2 border-[#333] rounded-md p-2 font-mono focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-500 ${
                      errors.message ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.message && (
                    <p className="mt-1 text-sm text-red-600 font-mono">{errors.message.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={sendingEmail}
                  className="w-full font-mono border-2 border-[#333] shadow-[0_4px_0_0_#333] bg-purple-500 hover:bg-purple-600 text-white transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200"
                >
                  {sendingEmail ? 'Sending...' : 'Send Test Email'}
                </Button>
              </div>
            </div>
          </form>
            
            <div className="flex items-center text-sm text-amber-600 font-mono">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span>This will send a real email to the specified address</span>
            </div>
        </div>
      </div>
    </div>
  );
});

export default SettingsPage;