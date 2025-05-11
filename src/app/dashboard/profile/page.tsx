"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Edit, Save, X, Mail, AtSign, Key, User as UserIcon, Shield, Code, Star } from "lucide-react";
import { toast } from "@/providers/notification-provider";
import * as profileApi from "./api";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    username: user?.username || "",
    email: user?.email || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Use the centralized profile API instead of auth context
      await profileApi.updateUserProfile(formData);
      // Update the user in auth context
      updateProfile(formData);
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div className="flex items-center">
            <div className="w-16 h-16 rounded-full bg-white border-2 border-[#333] shadow-[0_4px_0_0_#333] flex items-center justify-center overflow-hidden mr-4">
              <span className="text-2xl font-bold font-mono text-[#333]">
                {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold font-mono text-[#333] mb-1">
                {user?.first_name} {user?.last_name}
              </h1>
              <p className="text-gray-600 font-mono flex items-center">
                <AtSign className="w-4 h-4 mr-1" /> {user?.username}
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
                        className={`px-3 py-1 rounded-full border-2 font-mono text-sm font-medium flex items-center shadow-[0_2px_0_0_#333] ${badgeStyle}`}
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
              className="border-2 border-[#333] shadow-[0_4px_0_0_#333] font-mono text-[#333] bg-white hover:bg-[#fafafa] transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200"
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
      <div className="bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200">
        <h2 className="text-xl font-bold font-mono text-[#333] mb-6 flex items-center">
          <User className="mr-2 h-5 w-5" />
          Profile Information
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="first_name"
                className="block font-mono text-lg font-medium text-[#333] mb-2"
              >
                First Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={isEditing ? formData.first_name : user?.first_name || ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="pl-10 block w-full rounded-md border-2 border-[#333] shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] focus:border-[#333] transition-all duration-200 font-mono text-lg bg-white hover:bg-[#fafafa]"
                />
              </div>
            </div>
            
            <div>
              <label
                htmlFor="last_name"
                className="block font-mono text-lg font-medium text-[#333] mb-2"
              >
                Last Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={isEditing ? formData.last_name : user?.last_name || ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="pl-10 block w-full rounded-md border-2 border-[#333] shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] focus:border-[#333] transition-all duration-200 font-mono text-lg bg-white hover:bg-[#fafafa]"
                />
              </div>
            </div>
            
            <div>
              <label
                htmlFor="username"
                className="block font-mono text-lg font-medium text-[#333] mb-2"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <AtSign className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={isEditing ? formData.username : user?.username || ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="pl-10 block w-full rounded-md border-2 border-[#333] shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] focus:border-[#333] transition-all duration-200 font-mono text-lg bg-white hover:bg-[#fafafa]"
                />
              </div>
            </div>
            
            <div>
              <label
                htmlFor="email"
                className="block font-mono text-lg font-medium text-[#333] mb-2"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={isEditing ? formData.email : user?.email || ""}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="pl-10 block w-full rounded-md border-2 border-[#333] shadow-[0_4px_0_0_#333] focus:shadow-[0_6px_0_0_#333] focus:border-[#333] transition-all duration-200 font-mono text-lg bg-white hover:bg-[#fafafa]"
                />
              </div>
            </div>
          </div>
          
          {isEditing && (
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="border-2 border-[#333] shadow-[0_8px_0_0_#333] text-lg font-medium font-mono text-[#333] bg-white hover:bg-[#fafafa] transition-all duration-200 transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] active:translate-y-1 active:shadow-[0_4px_0_0_#333]"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin mr-2 h-5 w-5 border-2 border-[#333] border-t-transparent rounded-full"></div>
                    Saving...
                  </div>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </div>
      
      {/* Account security section */}
      <div className="bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200">
        <h2 className="text-xl font-bold font-mono text-[#333] mb-6 flex items-center">
          <Key className="mr-2 h-5 w-5" />
          Account Security
        </h2>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 border-2 border-[#333] rounded-md">
            <div>
              <h3 className="font-mono text-lg font-medium text-[#333]">Change Password</h3>
              <p className="text-sm font-mono text-gray-600">Update your password to keep your account secure</p>
            </div>
            <Button 
              onClick={() => router.push('/dashboard/change-password')}
              className="border-2 border-[#333] shadow-[0_4px_0_0_#333] font-mono text-[#333] bg-white hover:bg-[#fafafa] transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200"
            >
              <Key className="mr-2 h-4 w-4" />
              Change
            </Button>
          </div>
          
          <div className="flex justify-between items-center p-4 border-2 border-[#333] rounded-md">
            <div>
              <h3 className="font-mono text-lg font-medium text-[#333]">Two-Factor Authentication</h3>
              <p className="text-sm font-mono text-gray-600">Add an extra layer of security to your account</p>
            </div>
            <Button className="border-2 border-[#333] shadow-[0_4px_0_0_#333] font-mono text-[#333] bg-white hover:bg-[#fafafa] transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200">
              Enable
            </Button>
          </div>
          
          <div className="flex justify-between items-center p-4 border-2 border-[#333] rounded-md">
            <div>
              <h3 className="font-mono text-lg font-medium text-[#333]">Connected Accounts</h3>
              <p className="text-sm font-mono text-gray-600">Manage accounts connected to your profile</p>
            </div>
            <Button className="border-2 border-[#333] shadow-[0_4px_0_0_#333] font-mono text-[#333] bg-white hover:bg-[#fafafa] transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200">
              Manage
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
