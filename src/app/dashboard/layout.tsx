'use client';

import * as React from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { UserNav } from '@/components/dashboard/user-nav';
import { MainNavClient } from '@/components/dashboard/main-nav-client';
import { TenantProvider } from '@/hooks/use-tenant';
import { AiAssistant } from '@/components/dashboard/ai-assistant';
import { useSubscriptionGuard } from '@/hooks/use-subscription-guard';
import { ShieldAlert, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpired } = useSubscriptionGuard();

  if (isExpired) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
            <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-2xl border-t-8 border-t-red-600 space-y-6">
                <ShieldAlert className="h-16 w-16 text-red-600 mx-auto" />
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Trial Period Expired</h1>
                <p className="text-slate-500 font-medium leading-relaxed">
                    Your 30-day free trial has concluded. To continue accessing your patient records and clinical modules, please upgrade to a professional plan.
                </p>
                <div className="pt-4 space-y-3">
                    <Button asChild className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-bold">
                        <Link href="/#pricing">
                            <CreditCard className="mr-2 h-4 w-4" />
                            View Upgrade Plans
                        </Link>
                    </Button>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                        Your data remains securely stored and isolated.
                    </p>
                </div>
            </div>
        </div>
    );
  }

  return (
    <TenantProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center justify-between p-4">
              <h2 className="text-lg font-bold tracking-tight text-primary">GamMed</h2>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <MainNavClient />
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger className="sm:hidden" />
            <div className="flex-1" />
            <UserNav />
          </header>
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <AiAssistant />
    </TenantProvider>
  );
}
