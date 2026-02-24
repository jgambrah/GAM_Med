'use client';

import * as React from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; 
import { useRouter } from 'next/navigation';

/**
 * == Super Admin Initializer ==
 * 
 * This page is used to create the very first Super Admin account.
 * Once the account is created, this file should be deleted for security.
 */
export default function InitSuperAdminPage() {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const router = useRouter();
    const auth = useAuth();
    const db = useFirestore();

    const handleInit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const hospitalId = 'GAMMED_HQ';
        const normalizedEmail = email.toLowerCase().trim();
        const now = new Date().toISOString();
        
        try {
            // 1. Create the user in Firebase Auth
            const userCred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
            const authUid = userCred.user.uid;
            
            // 2. Provision the Super Admin Profile
            const userDocId = `${hospitalId}_${normalizedEmail}`;
            await setDoc(doc(db, 'users', userDocId), {
                uid: authUid,
                email: normalizedEmail,
                name: "GamMed CEO",
                role: 'super_admin',
                hospitalId: hospitalId,
                is_active: true,
                created_at: now
            });

            // 3. Provision the HQ Hospital Record
            await setDoc(doc(db, 'hospitals', hospitalId), {
                hospitalId: hospitalId,
                name: "Gam It Services HQ",
                slug: "gammed-hq",
                status: "active",
                subscriptionTier: "premium",
                createdAt: now
            });

            alert("Super Admin account created successfully!");
            router.push('/login');
        } catch (error: any) {
            console.error("Initialization error:", error);
            alert("Error: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
            <div className="mx-auto max-w-sm w-full bg-white p-8 rounded-lg shadow-md border-t-4 border-t-primary space-y-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold">System Initialization</h1>
                    <p className="text-sm text-muted-foreground">Create the platform owner account</p>
                </div>
                <form onSubmit={handleInit} className="grid gap-4">
                    <div className="grid gap-2">
                        <label htmlFor="email" className="text-sm font-medium">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="ceo@gammed.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="password" title="Password" className="text-sm font-medium">Password</label>
                        <input 
                            id="password" 
                            type="password" 
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                        disabled={isLoading}
                    >
                        {isLoading ? "Initialising..." : "Create CEO Account"}
                    </button>
                </form>
                <p className="text-[10px] text-destructive font-bold text-center uppercase">
                    Security Warning: Delete this file after use.
                </p>
            </div>
        </div>
    );
}
