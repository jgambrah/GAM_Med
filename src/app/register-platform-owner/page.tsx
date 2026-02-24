'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

/**
 * == Master Platform Setup ==
 * 
 * This page is used once by the developer to create the Super Admin account
 * and the internal platform tenant (GAMMED_HQ).
 */
export default function PlatformOwnerSetup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [adminKey, setAdminKey] = useState('');
    const router = useRouter();
    const auth = useAuth();
    const db = useFirestore();

    useEffect(() => {
        // Debug check for developers
        if (!process.env.NEXT_PUBLIC_MASTER_SECRET_KEY) {
            console.warn("DEVELOPER ALERT: NEXT_PUBLIC_MASTER_SECRET_KEY is not defined in your .env file.");
        }
    }, []);

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Validate against secret key
        const masterKey = process.env.NEXT_PUBLIC_MASTER_SECRET_KEY;
        
        if (!masterKey) {
            return toast.error("System Error", { description: "Master Secret Key is not configured on the server." });
        }

        if (adminKey !== masterKey) {
            return toast.error("Unauthorized", { description: "Invalid Master Admin Key. Please check your .env file." });
        }

        try {
            // 2. Create the Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // 3. Provision Internal Tenant (HQ)
            const hospitalId = 'GAMMED_HQ';
            const userDocId = `${hospitalId}_${email.toLowerCase().trim()}`;

            // 4. Create Super Admin Document
            await setDoc(doc(db, 'users', userDocId), {
                uid: uid,
                email: email.toLowerCase(),
                name: "GamMed CEO",
                role: 'super_admin',
                hospitalId: hospitalId,
                is_active: true,
                created_at: new Date().toISOString()
            });

            // 5. Create the HQ Hospital Doc
            await setDoc(doc(db, 'hospitals', hospitalId), {
                hospitalId: hospitalId,
                name: "Gam It Services HQ",
                slug: "gammed-hq",
                status: "active",
                subscriptionTier: "premium",
                isInternal: true,
                createdAt: new Date().toISOString()
            });

            toast.success("Super Admin Created!", {
                description: "You can now log in to the Platform Operations center."
            });
            router.push('/login');
        } catch (error: any) {
            console.error("Setup failed:", error);
            toast.error("Registration Failed", { description: error.message });
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
                            <Label htmlFor="adminKey">Master Secret Key</Label>
                            <Input 
                                id="adminKey"
                                type="password" 
                                value={adminKey} 
                                onChange={(e) => setAdminKey(e.target.value)} 
                                placeholder="Enter Secret Key" 
                                required
                            />
                        </div>
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
                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2">
                            Create Master Account & Initialize HQ
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
