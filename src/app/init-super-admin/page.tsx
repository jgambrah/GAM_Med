'use client';

import * as React from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

/**
 * == One-Time Platform Initializer ==
 * 
 * Run this page ONCE in your browser to create the Master Super Admin account
 * and the internal GAMMED_HQ tenant.
 * 
 * CRITICAL: Delete this file from your project immediately after use.
 */
export default function InitAdmin() {
    const auth = useAuth();
    const db = useFirestore();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = React.useState(false);

    const [email, setEmail] = React.useState('ceo@gammed.com');
    const [password, setPassword] = React.useState('');

    const runSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) {
            toast.error("Please set a secure password.");
            return;
        }

        setIsProcessing(true);
        try {
            // 1. Create the Auth User
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const hospitalId = 'GAMMED_HQ';
            
            // Pattern: {hospitalId}_{email}
            const userDocId = `${hospitalId}_${email.toLowerCase().trim()}`;

            const batch = writeBatch(db);

            // 2. Create the user doc with Super Admin privileges
            const userRef = doc(db, 'users', userDocId);
            batch.set(userRef, {
                uid: cred.user.uid,
                email: email.toLowerCase().trim(),
                role: 'super_admin',
                hospitalId: hospitalId,
                name: 'GamMed CEO',
                is_active: true,
                created_at: new Date().toISOString(),
                last_login: new Date().toISOString()
            });

            // 3. Create the HQ Hospital Doc (The Platform Root)
            const hospitalRef = doc(db, 'hospitals', hospitalId);
            batch.set(hospitalRef, {
                hospitalId: hospitalId,
                name: "Gam It Services HQ",
                slug: "gammed-hq",
                status: "active",
                subscriptionTier: "premium",
                isInternal: true,
                createdAt: new Date().toISOString()
            });

            await batch.commit();

            alert("SUCCESS! Super Admin Created & HQ Initialized.\n\nIMPORTANT: Delete src/app/init-super-admin/page.tsx now!");
            router.push('/login');
        } catch (e: any) { 
            console.error(e);
            alert("Error: " + e.message); 
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/50 p-4">
            <Card className="w-full max-w-md border-t-4 border-t-primary shadow-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Platform Initializer</CardTitle>
                    <CardDescription>
                        Create the Master Account and root tenant.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={runSetup} className="space-y-4">
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                            <strong>Warning:</strong> This will create a Super Admin with the email <em>{email}</em>. Ensure your Firebase project is fresh.
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Master Password</label>
                            <input 
                                type="password" 
                                className="w-full p-2 border rounded-md"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Set a strong password"
                                required
                            />
                        </div>
                        <Button 
                            type="submit"
                            className="w-full h-12 text-lg font-bold"
                            disabled={isProcessing}
                        >
                            {isProcessing ? "Initializing..." : "Initialize GamMed System"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
