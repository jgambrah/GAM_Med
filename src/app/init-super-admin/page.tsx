'use client';

import * as React from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; 
import { useRouter } from 'next/navigation'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

/**
 * == Master Platform Setup ==
 * 
 * This page is used once to create the Super Admin account and the internal 
 * platform tenant (GAMMED_HQ).
 * 
 * SECURITY WARNING: Remove this file immediately after successful use.
 */
export default function PlatformOwnerSetup() {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const router = useRouter();
    const auth = useAuth();
    const db = useFirestore();
    const [isLoading, setIsLoading] = React.useState(false);

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // 1. Create the Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // 2. Provision Internal Tenant (HQ)
            const hospitalId = 'GAMMED_HQ';
            const userDocId = `${hospitalId}_${email.toLowerCase().trim()}`;

            // 3. Create Super Admin Profile Document
            await setDoc(doc(db, 'users', userDocId), {
                uid: uid,
                email: email.toLowerCase(),
                name: "GamMed CEO",
                role: 'super_admin',
                hospitalId: hospitalId,
                is_active: true,
                created_at: new Date().toISOString()
            });

            // 4. Create the HQ Hospital Master Record
            await setDoc(doc(db, 'hospitals', hospitalId), {
                hospitalId: hospitalId,
                name: "Gam It Services HQ",
                slug: "gammed-hq",
                status: "active",
                subscriptionTier: "premium",
                isInternal: true,
                createdAt: new Date().toISOString()
            });

            toast.success("SUCCESS! HQ Initialized. Redirecting to login...");
            router.push('/login');
        } catch (error: any) {
            console.error("Initialization failed:", error);
            toast.error("FAILED: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 p-4">
            <Card className="w-full max-w-md border-t-4 border-t-blue-600 shadow-2xl">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl text-center font-bold">Platform Initialization</CardTitle>
                    <p className="text-center text-sm text-muted-foreground">
                        Securely provision the GamMed Master Account
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSetup} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Admin Email</Label>
                            <Input 
                                id="email"
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                placeholder="ceo@gammed.com" 
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Set Secure Password</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2" disabled={isLoading}>
                            {isLoading ? 'Initializing...' : 'Create Master Account & Initialize HQ'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}