"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState, memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileUpdateSchema, type ProfileUpdateFormData } from "@/lib/validation-schemas";
import { User, Edit, Save, X, Mail, AtSign, Key, Shield, Code, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as profileApi from "./api";
import { Spinner } from "@/components/ui/ios-spinner";

const ProfilePage = memo(function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      username: user?.username || "",
      email: user?.email || "",
    },
  });

  const onSubmit = useCallback(async (data: ProfileUpdateFormData) => {
    setIsSubmitting(true);
    
    try {
      // Use the centralized profile API
      await profileApi.updateUserProfile(data);
      // Update the user in auth context
      updateProfile(data);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [updateProfile]);

  const handleCancel = () => {
    reset({
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      username: user?.username || "",
      email: user?.email || "",
    });
    setIsEditing(false);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch(role.toLowerCase()) {
      case "admin":
        return "destructive";
      case "developer":
        return "secondary";
      case "moderator":
        return "default";
      default:
        return "outline";
    }
  };

  const getRoleIcon = (role: string) => {
    switch(role.toLowerCase()) {
      case "admin":
        return Shield;
      case "developer":
        return Code;
      case "moderator":
        return Star;
      default:
        return User;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and personal information.
        </p>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xl font-semibold">
                {(user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U')}
                {(user?.last_name?.charAt(0) || user?.username?.charAt(1) || 'U')}
              </div>
              <div>
                <CardTitle className="text-xl">
                  {(user?.first_name && user?.last_name) 
                    ? `${user.first_name} ${user.last_name}` 
                    : (user?.username || 'User')}
                </CardTitle>
                <CardDescription className="flex items-center mt-1">
                  <Mail className="w-4 h-4 mr-1" />
                  {user?.email}
                </CardDescription>
                {user?.roles && user.roles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.roles.map((role) => {
                      const Icon = getRoleIcon(role);
                      return (
                        <Badge key={role} variant={getRoleBadgeVariant(role)} className="text-xs">
                          <Icon className="w-3 h-3 mr-1" />
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <Button 
              onClick={() => setIsEditing(!isEditing)}
              variant={isEditing ? "outline" : "default"}
            >
              {isEditing ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your personal details and contact information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  {...register("first_name")}
                  id="first_name"
                  type="text"
                  disabled={!isEditing}
                  className={errors.first_name ? 'border-red-500' : ''}
                />
                {errors.first_name && (
                  <p className="text-sm text-red-600">{errors.first_name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  {...register("last_name")}
                  id="last_name"
                  type="text"
                  disabled={!isEditing}
                  className={errors.last_name ? 'border-red-500' : ''}
                />
                {errors.last_name && (
                  <p className="text-sm text-red-600">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  {...register("username")}
                  id="username"
                  type="text"
                  disabled={!isEditing}
                  className={`pl-10 ${errors.username ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.username && (
                <p className="text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  {...register("email")}
                  id="email"
                  type="email"
                  disabled={!isEditing}
                  className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Account Security
          </CardTitle>
          <CardDescription>
            Manage your account security and password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/change-password')}
            className="w-full justify-start"
          >
            <Key className="mr-2 h-4 w-4" />
            Change Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});

export default ProfilePage;