'use client';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Building2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function PayerPortalLayout({ children }: { children: React.ReactNode }) {
    const { user } = useUser();
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        if(auth) await signOut(auth);
        router.push('/');
    }

    return (
        <div className="min-h-screen bg-slate-50">
             <header className="bg-white border-b p-4 shadow-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Building2 className="text-primary"/>
                        <h1 className="font-bold text-lg text-foreground">Corporate Health Portal</h1>
                    </div>
                    {user && <Button variant="outline" size="sm" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4"/>Sign Out</Button>}
                </div>
            </header>
            <main>{children}</main>
        </div>
    );
}
