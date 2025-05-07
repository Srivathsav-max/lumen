"use client";

import { WaitlistTable } from "@/components/dashboard/waitlist-table";

export default function WaitlistPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-mono text-[#333]">Waitlist Management</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-[0_4px_0_0_#333] border-2 border-[#333] p-6">
        <WaitlistTable />
      </div>
    </div>
  );
} 