"use client";

import { useState } from "react";
// Legacy import removed; using AppSidebar elsewhere
import { DashboardFeature, FeatureRouter } from "./feature-router";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [currentFeature, setCurrentFeature] = useState<DashboardFeature>("home");

  // Function to handle feature navigation
  const navigateToFeature = (feature: DashboardFeature) => {
    setCurrentFeature(feature);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <main className="flex-1 overflow-y-auto p-6">
        <FeatureRouter feature={currentFeature}>{children}</FeatureRouter>
      </main>
    </div>
  );
}
