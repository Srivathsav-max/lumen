import { Suspense } from 'react';
import ResetPasswordClient from './ResetPasswordClient';
import { Spinner } from '@/components/ui/ios-spinner';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden sketchy-black-bg">
        <div className="sketchy-grid" />
        <div className="w-full max-w-md space-y-6 relative">
          <div className="text-center">
            <h2 className="mt-4 text-4xl font-mono font-medium text-white relative">
              Reset Password
              <div className="absolute -inset-1 bg-gradient-to-br from-[#333] to-[#666] -z-10 transform translate-y-1 rounded-lg opacity-10" />
            </h2>
            <p className="mt-2 text-center text-gray-300 font-mono text-lg">
              Set a new password for your account
            </p>
          </div>
          <div className="mt-6 bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200 overflow-y-auto max-h-[70vh]">
            <div className="space-y-6 text-center">
              <div className="mx-auto flex items-center justify-center">
                <Spinner size="lg" />
              </div>
              <h3 className="text-xl font-mono font-medium text-[#333]">Loading...</h3>
              <p className="text-gray-600 font-mono">
                Please wait while we load the page...
              </p>
            </div>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordClient />
    </Suspense>
  );
}