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
import { AuthProvider } from '@/context/auth-provider';
import { TenantProvider } from '@/hooks/use-tenant';
import { AiAssistant } from '@/components/dashboard/ai-assistant';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseClientProvider>
      <AuthProvider>
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
      </AuthProvider>
    </FirebaseClientProvider>
  );
}
