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
            console.warn("DEVELOPER ALERT: NEXT_PUBLIC_MASTER_SECRET_KEY is not defined in your environment.");
        }
    }, []);

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Starting initialization...");
        console.log("Input Key:", adminKey);
        console.log("Expected Key:", process.env.NEXT_PUBLIC_MASTER_SECRET_KEY);

        if (adminKey !== process.env.NEXT_PUBLIC_MASTER_SECRET_KEY) {
            alert("Key mismatch! What you typed does not match NEXT_PUBLIC_MASTER_SECRET_KEY in your .env file.");
            return;
        }

        try {
            // 1. Create the Auth User
            console.log("Attempting to create Auth user...");
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;
            console.log("Auth user created with UID:", uid);

            // 2. Provision Internal Tenant (HQ)
            const hospitalId = 'GAMMED_HQ';
            const userDocId = `${hospitalId}_${email.toLowerCase().trim()}`;

            // 3. Create Super Admin Document
            console.log("Creating Firestore User Document...");
            await setDoc(doc(db, 'users', userDocId), {
                uid: uid,
                email: email.toLowerCase(),
                name: "GamMed CEO",
                role: 'super_admin',
                hospitalId: hospitalId,
                is_active: true,
                created_at: new Date().toISOString()
            });

            // 4. Create the HQ Hospital Doc
            console.log("Creating Firestore Hospital Document...");
            await setDoc(doc(db, 'hospitals', hospitalId), {
                hospitalId: hospitalId,
                name: "Gam It Services HQ",
                slug: "gammed-hq",
                status: "active",
                subscriptionTier: "premium",
                isInternal: true,
                createdAt: new Date().toISOString()
            });

            alert("SUCCESS! HQ Initialized and Super Admin created. Redirecting to login...");
            router.push('/login');
        } catch (error: any) {
            console.error("FULL ERROR OBJECT:", error);
            alert("FAILED: " + error.message);
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
