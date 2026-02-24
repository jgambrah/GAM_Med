'use client';

import * as React from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

    const runSetup = async () => {
        const email = "ceo@gammed.com"; // YOUR MASTER EMAIL
        const password = "YourSecurePassword123!"; // YOUR MASTER PASSWORD
        
        setIsProcessing(true);
        try {
            // 1. Create the Auth User
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const hospitalId = 'GAMMED_HQ';
            
            // Pattern: {hospitalId}_{email}
            const userDocId = `${hospitalId}_${email.toLowerCase().trim()}`;

            // 2. Create the user doc with Super Admin privileges
            await setDoc(doc(db, 'users', userDocId), {
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
            await setDoc(doc(db, 'hospitals', hospitalId), {
                hospitalId: hospitalId,
                name: "Gam It Services HQ",
                slug: "gammed-hq",
                status: "active",
                subscriptionTier: "premium",
                isInternal: true,
                createdAt: new Date().toISOString()
            });

            alert("SUCCESS! Super Admin Created & HQ Initialized.\n\nIMPORTANT: Delete src/app/init-super-admin/page.tsx now!");
            router.push('/login');
        } catch (e: any) { 
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
                <CardContent className="space-y-4">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                        <strong>Warning:</strong> This will create a Super Admin with the email <em>ceo@gammed.com</em>. Ensure your Firebase project is fresh.
                    </div>
                    <Button 
                        onClick={runSetup} 
                        className="w-full h-12 text-lg font-bold"
                        disabled={isProcessing}
                    >
                        {isProcessing ? "Initializing..." : "Initialize GamMed System"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
