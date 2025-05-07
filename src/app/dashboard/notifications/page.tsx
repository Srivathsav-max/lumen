"use client";

import { NotFound } from "@/components/ui/not-found";

export default function NotificationsPage() {
  return (
    <NotFound 
      title="Notifications Feature"
      description="This feature is currently under development. Please check back later."
      backUrl="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
} 