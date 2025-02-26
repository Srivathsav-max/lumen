"use client";

import React from 'react';
import { 
  Bell,
  Lock,
  Globe,
  Moon,
  Monitor,
  Mail,
  Shield,
  Download,
  HelpCircle,
  LogOut,
  ChevronRight
} from 'lucide-react';

export const SettingsPage = () => {
  return (
    <div className="h-full flex flex-col bg-white rounded-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account preferences and settings</p>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Account Settings */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Account Settings</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="flex gap-4">
                    <input
                      type="email"
                      value="alex.johnson@example.com"
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      readOnly
                    />
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                      Change
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                    Change Password
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Preferences</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[
                  { icon: <Bell className="w-5 h-5" />, title: 'Notifications', description: 'Manage your notification preferences' },
                  { icon: <Moon className="w-5 h-5" />, title: 'Appearance', description: 'Dark mode and theme settings' },
                  { icon: <Globe className="w-5 h-5" />, title: 'Language', description: 'Change language settings' },
                  { icon: <Monitor className="w-5 h-5" />, title: 'Display', description: 'Customize your learning interface' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{item.title}</h3>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-full">
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Privacy & Security</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-500">Add an extra layer of security</p>
                  </div>
                </div>
                <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-gray-200">
                  <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Lock className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">Privacy Settings</h3>
                    <p className="text-sm text-gray-500">Manage your privacy preferences</p>
                  </div>
                </div>
                <button className="px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg">
                  Configure
                </button>
              </div>
            </div>
          </div>

          {/* Support & Help */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Support & Help</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg">
                  <HelpCircle className="w-5 h-5 text-indigo-600" />
                  <span className="font-medium text-gray-900">Help Center</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg">
                  <Download className="w-5 h-5 text-indigo-600" />
                  <span className="font-medium text-gray-900">Download Data</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 text-left text-red-600 hover:bg-red-50 rounded-lg">
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
