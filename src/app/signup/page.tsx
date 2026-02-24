'use client';

import * as React from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

/**
 * == Master Platform Setup ==
 * 
 * This page is used to create the first Super Admin account
 * and initialize the internal platform tenant (GAMMED_HQ).
 * DELETE THIS FILE AFTER USE.
 */
export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const auth = useAuth();
    const db = useFirestore();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // 1. Create the user in Firebase Auth
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCred.user.uid;

            // 2. Define the SaaS identification pattern
            const hospitalId = 'GAMMED_HQ';
            const userDocId = `${hospitalId}_${email.toLowerCase().trim()}`;

            // 3. Create the user document in Firestore (The "God Mode" profile)
            await setDoc(doc(db, 'users', userDocId), {
                uid: uid,
                email: email.toLowerCase().trim(),
                name: "GamMed CEO",
                role: 'super_admin',
                hospitalId: hospitalId,
                is_active: true,
                created_at: new Date().toISOString()
            });

            // 4. Create the Hospital Master Record for the platform owner
            await setDoc(doc(db, 'hospitals', hospitalId), {
                hospitalId: hospitalId,
                name: "Gam It Services HQ",
                slug: "gammed-hq",
                status: "active",
                subscriptionTier: "premium",
                createdAt: new Date().toISOString()
            });

            toast.success("CEO Account Created", {
                description: "Platform initialized. Please DELETE src/app/signup/page.tsx after logging in."
            });
            
            router.push('/login');

        } catch (error: any) {
            console.error(error);
            toast.error("Signup Failed", {
                description: error.message
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/50 p-4">
            <Card className="mx-auto max-w-sm w-full shadow-lg border-t-4 border-t-primary">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl text-center font-bold">Platform Initializer</CardTitle>
                    <CardDescription className="text-center">
                        Create the first Super Admin account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignup} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Admin Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="ceo@gammed.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Admin Password</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                required 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <Button type="submit" className="w-full mt-2 h-11" disabled={isLoading}>
                            {isLoading ? "Initializing System..." : "Create CEO Account"}
                        </Button>
                    </form>
                    <p className="mt-4 text-xs text-center text-muted-foreground italic">
                        Note: Once created, you will have full access to manage all hospital tenants.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
