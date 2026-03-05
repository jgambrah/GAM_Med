'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AuthForm } from '@/components/app/auth-form';

export function LoginDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  // The AuthForm handles its own state and redirects upon successful
  // authentication, which will cause the page to reload and the dialog to close.
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="sr-only">
            <DialogTitle>Authentication</DialogTitle>
            <DialogDescription>
                Log in to your GAM_Med account or create a new one to continue.
            </DialogDescription>
        </DialogHeader>
         <AuthForm />
      </DialogContent>
    </Dialog>
  );
}
