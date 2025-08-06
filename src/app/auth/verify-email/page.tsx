import { Suspense } from 'react';
import VerifyEmailClient from './VerifyEmailClient';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-gray-50">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Email Verification
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Verify your email address to access all features
            </p>
          </div>
          <Card>
            <CardContent className="space-y-6 text-center">
              <div className="mx-auto flex items-center justify-center">
                <Spinner size="lg" />
              </div>
              <CardTitle className="text-xl">Loading...</CardTitle>
              <CardDescription>
                Please wait while we load the page...
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <VerifyEmailClient />
    </Suspense>
  );
}