"use client";

import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { AccountingSidebar } from "@/components/accounting/accounting-sidebar";
import { AccountingHeader } from "@/components/accounting/accounting-header";
import { AccountingProvider } from "@/contexts/accounting-context";

export default function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AccountingProvider>
      <div className="flex h-screen overflow-hidden bg-[#FAF7F2]">
        {/* القائمة الجانبية - تظهر حسب الحالة */}
        <AccountingSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* المحتوى الرئيسي */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AccountingHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
        <Toaster />
      </div>
    </AccountingProvider>
  );
}
