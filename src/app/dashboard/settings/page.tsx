"use client";

import { useEffect, useState, memo, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { testEmailSchema, type TestEmailFormData } from "@/lib/validation-schemas";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NotFound } from "@/components/ui/not-found";
import { AlertCircle, Lock, Mail, Settings, Shield, Users, Wrench, Send } from "lucide-react";
import { toast } from "@/providers/notification-provider";
import * as settingsApi from "./api";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const registrationEnabled = settings.find(s => s.key === 'registration_enabled')?.value === 'true';
  const maintenanceMode = settings.find(s => s.key === 'maintenance_mode')?.value === 'true';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">


        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Registration Settings */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">User Registration</CardTitle>
                  <CardDescription>Control new user sign-ups</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Allow New Registrations</Label>
                  <p className="text-sm text-gray-500">
                    {registrationEnabled 
                      ? "New users can create accounts" 
                      : "New user registration is disabled"}
                  </p>
                </div>
                <Switch
                  checked={registrationEnabled}
                  onCheckedChange={(checked) => toggleRegistration(checked)}
                  disabled={updating}
                />
              </div>
              
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Changes take effect immediately
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
          
          {/* Maintenance Mode Settings */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <Wrench className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Maintenance Mode</CardTitle>
                  <CardDescription>Control system access</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Maintenance Mode</Label>
                  <p className="text-sm text-gray-500">
                    {maintenanceMode 
                      ? "Site is in maintenance mode" 
                      : "Site is operating normally"}
                  </p>
                </div>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={(checked) => updateSetting('maintenance_mode', String(checked))}
                  disabled={updating}
                />
              </div>
              
              <Alert className="border-blue-200 bg-blue-50">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Only admins and developers can access in maintenance mode
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Email Testing */}
          <Card className="border-gray-200 shadow-sm md:col-span-2">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Email Testing</CardTitle>
                  <CardDescription>Test email configuration</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmitTestEmail)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="to">Recipient Email</Label>
                    <Input
                      id="to"
                      type="email"
                      placeholder="recipient@example.com"
                      {...register("to")}
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                    {errors.to && (
                      <p className="text-red-500 text-sm">{errors.to.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      type="text"
                      placeholder="Test Email Subject"
                      {...register("subject")}
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                    {errors.subject && (
                      <p className="text-red-500 text-sm">{errors.subject.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Input
                      id="message"
                      type="text"
                      placeholder="Test email message"
                      {...register("message")}
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                    {errors.message && (
                      <p className="text-red-500 text-sm">{errors.message.message}</p>
                    )}
                  </div>
                </div>
                
                <Button
                  type="submit"
                  disabled={sendingEmail}
                  className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white"
                >
                  {sendingEmail ? (
                    <>
                      <Spinner className="mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Test Email
                    </>
                  )}
                </Button>
                
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    This will send a real email to the specified address
                  </AlertDescription>
                </Alert>
              </form>
            </CardContent>
          </Card>
      </div>
    </div>
  );
});

export default SettingsPage;