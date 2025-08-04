

"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import { MainNav } from "@/components/dashboard/main-nav";
import { UserNav } from "@/components/dashboard/user-nav";
import { SidebarProvider, Sidebar, SidebarInset, SidebarFooter } from "@/components/ui/sidebar";
import { useAuth } from "@/components/auth-provider";
import { AiAssistant } from "./dashboard/ai-assistant";

const useGeminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY !== undefined;

export default function Dashboard({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();
  
  if (!user) {
    // This can happen briefly during initial load or redirect.
    // Returning null prevents rendering the dashboard for a non-existent user.
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <div className="flex flex-col h-full">
          <div className="p-4">
             <h1 className="text-2xl font-bold font-headline text-primary-foreground">MedFlow GH</h1>
          </div>
          <MainNav role={user.role} />
          {useGeminiApiKey && (
            <SidebarFooter className="p-2 mt-auto">
              <AiAssistant />
            </SidebarFooter>
          )}
        </div>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col h-screen">
          <Header>
            <UserNav user={user} />
          </Header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
             {/* 
                By removing the complex routing logic from this component,
                we now let Next.js's App Router do its job. The `children`
                prop will be whatever page component Next.js has matched
                for the current URL (e.g., `app/admin/referrals/page.tsx`).
                This is a much cleaner and more reliable pattern.
             */}
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
