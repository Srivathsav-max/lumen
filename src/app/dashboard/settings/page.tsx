"use client";

import { useEffect, useState, memo, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { testEmailSchema, type TestEmailFormData } from "@/lib/validation-schemas";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Lock, Mail, Settings, Shield, Users, Wrench, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as settingsApi from "./api";
import { Spinner } from "@/components/ui/ios-spinner";

// Import the SystemSetting interface from the API
import { SystemSetting } from './api';

const SettingsPage = memo(function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

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
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to load settings. Please try again later.',
        variant: "destructive",
      });
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

      toast({
        title: "Success",
        description: "Setting updated successfully",
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update setting. Please try again later.',
        variant: "destructive",
      });
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
          setting.key === 'registration_enabled' ? { ...setting, value: enabled ? 'true' : 'false' } : setting
        )
      );

      toast({
        title: "Success",
        description: `Registration ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling registration:', error);
      toast({
        title: "Error", 
        description: error instanceof Error ? error.message : 'Failed to update registration setting. Please try again later.',
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const onSubmitTestEmail = async (data: TestEmailFormData) => {
    setSendingEmail(true);
    
    try {
      // Use the settings API module
      await settingsApi.sendTestEmail(data);
      toast({
        title: "Success",
        description: "Test email sent successfully! Check your inbox.",
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to send test email. Please try again later.',
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const getSettingValue = (key: string): string => {
    const setting = settings.find(s => s.key === key);
    return setting?.value?.toString() || '';
  };

  const getRegistrationEnabled = (): boolean => {
    const setting = settings.find(s => s.key === 'registration_enabled');
    return setting?.value === 'true';
  };

  if (!isAdminOrDeveloper) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access the settings page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Only administrators and developers can access system settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your application settings and configuration.
          </p>
        </div>
        <Button onClick={fetchSettings} disabled={updating} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Settings
          </CardTitle>
          <CardDescription>
            Configure core system functionality and features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Registration Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">User Registration</Label>
              <p className="text-sm text-muted-foreground">
                Allow new users to register for accounts
              </p>
            </div>
            <Switch
              checked={getRegistrationEnabled()}
              onCheckedChange={toggleRegistration}
              disabled={updating}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Testing
          </CardTitle>
          <CardDescription>
            Send a test email to verify email service configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitTestEmail)} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="to">To Email</Label>
              <Input
                id="to"
                type="email"
                {...register("to")}
                placeholder="recipient@example.com"
                className={errors.to ? 'border-red-500' : ''}
              />
              {errors.to && (
                <p className="text-sm text-red-600">{errors.to.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                {...register("subject")}
                className={errors.subject ? 'border-red-500' : ''}
              />
              {errors.subject && (
                <p className="text-sm text-red-600">{errors.subject.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                {...register("message")}
                className={`min-h-[100px] ${errors.message ? 'border-red-500' : ''}`}
              />
              {errors.message && (
                <p className="text-sm text-red-600">{errors.message.message}</p>
              )}
            </div>

            <Button type="submit" disabled={sendingEmail}>
              {sendingEmail ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
});

export default SettingsPage;