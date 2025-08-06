"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, memo, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileUpdateSchema, type ProfileUpdateFormData } from "@/lib/validation-schemas";
import { User, Edit, Save, X, Mail, AtSign, Key, User as UserIcon, Shield, Code, Star } from "lucide-react";
import { toast } from "@/providers/notification-provider";
import * as profileApi from "./api";
import { Spinner } from "@/components/ui/spinner";

const ProfilePage = memo(function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
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
      // Use the centralized profile API instead of auth context
      await profileApi.updateUserProfile(data);
      // Update the user in auth context
      updateProfile(data);
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  }, [updateProfile]);

  return (
    <div className="max-h-screen overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        {/* Profile header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gray-100 rounded-full p-4">
                <UserIcon className="h-12 w-12 text-gray-600" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900 mb-2">
                  {(user?.first_name && user?.last_name) ? `${user.first_name} ${user.last_name}` : (user?.username || 'User Profile')}
                </h1>
                <p className="text-gray-600">
                  {user?.email}
                </p>
                {user?.roles && user.roles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.roles.map((role) => {
                      // Define badge styles based on role
                      let badgeStyle = "";
                      let BadgeIcon = User;
                      
                      switch(role.toLowerCase()) {
                        case "admin":
                          badgeStyle = "bg-red-100 text-red-800 border-red-300";
                          BadgeIcon = Shield;
                          break;
                        case "developer":
                          badgeStyle = "bg-purple-100 text-purple-800 border-purple-300";
                          BadgeIcon = Code;
                          break;
                        case "moderator":
                          badgeStyle = "bg-blue-100 text-blue-800 border-blue-300";
                          BadgeIcon = Star;
                          break;
                        default:
                          badgeStyle = "bg-gray-100 text-gray-800 border-gray-300";
                          BadgeIcon = User;
                      }
                      
                      return (
                        <div 
                          key={role}
                          className={`px-3 py-1 rounded-full border text-sm font-medium flex items-center ${badgeStyle}`}
                        >
                          <BadgeIcon className="w-3 h-3 mr-1" />
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <Button 
                onClick={() => setIsEditing(!isEditing)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isEditing ? (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Cancel Editing
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Profile form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <User className="mr-2 h-5 w-5" />
          Profile Information
        </h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="first_name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                First Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  {...register("first_name")}
                  id="first_name"
                  type="text"
                  disabled={!isEditing}
                  className={`pl-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 disabled:bg-gray-50 disabled:text-gray-500 ${
                    errors.first_name ? 'border-red-300 focus:border-red-300 focus:ring-red-300' : ''
                  }`}
                />
                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
                )}
              </div>
            </div>
            
            <div>
              <label
                htmlFor="last_name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Last Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  {...register("last_name")}
                  id="last_name"
                  type="text"
                  disabled={!isEditing}
                  className={`pl-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 disabled:bg-gray-50 disabled:text-gray-500 ${
                    errors.last_name ? 'border-red-300 focus:border-red-300 focus:ring-red-300' : ''
                  }`}
                />
                {errors.last_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
                )}
              </div>
            </div>
            
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <AtSign className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  {...register("username")}
                  id="username"
                  type="text"
                  disabled={!isEditing}
                  className={`pl-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 disabled:bg-gray-50 disabled:text-gray-500 ${
                    errors.username ? 'border-red-300 focus:border-red-300 focus:ring-red-300' : ''
                  }`}
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
                )}
              </div>
            </div>
            
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  {...register("email")}
                  id="email"
                  type="email"
                  disabled={!isEditing}
                  className={`pl-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 disabled:bg-gray-50 disabled:text-gray-500 ${
                    errors.email ? 'border-red-300 focus:border-red-300 focus:ring-red-300' : ''
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>
          </div>
          
          {isEditing && (
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </div>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
        </div>
        
        {/* Account security section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Key className="mr-2 h-5 w-5" />
          Account Security
        </h2>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Change Password</h3>
              <p className="text-sm text-gray-600">Update your password to keep your account secure</p>
            </div>
            <Button 
              onClick={() => router.push('/dashboard/change-password')}
              variant="outline"
              className="border-gray-200 hover:bg-gray-50"
            >
              <Key className="mr-2 h-4 w-4" />
              Change
            </Button>
          </div>
          
          <div className="flex justify-between items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
            </div>
            <Button variant="outline" className="border-gray-200 hover:bg-gray-50">
              Enable
            </Button>
          </div>
          
          <div className="flex justify-between items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Connected Accounts</h3>
              <p className="text-sm text-gray-600">Manage accounts connected to your profile</p>
            </div>
            <Button variant="outline" className="border-gray-200 hover:bg-gray-50">
              Manage
            </Button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
});

export default ProfilePage;
