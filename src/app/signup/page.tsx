'use client';

import * as React from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, writeBatch } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

/**
 * == Master Platform Initializer ==
 * 
 * This page allows the first-time setup of the GamMed Super Admin account.
 * It provisions the Super Admin profile and the mandatory role marker document
 * required for DBAC security rules.
 */
export default function SignUpPage() {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [name, setName] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const router = useRouter();
    const auth = useAuth();
    const db = useFirestore();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const hospitalId = 'GAMMED_HQ';
        const normalizedEmail = email.toLowerCase().trim();
        const now = new Date().toISOString();
        
        try {
            // 1. Create the user in Firebase Auth
            const userCred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
            const authUid = userCred.user.uid;
            
            // 2. Atomic Batch Provisioning
            const batch = writeBatch(db);

            // Provision the Super Admin Profile
            const userDocId = `${hospitalId}_${normalizedEmail}`;
            batch.set(doc(db, 'users', userDocId), {
                uid: authUid,
                email: normalizedEmail,
                name: name,
                role: 'super_admin',
                hospitalId: hospitalId,
                is_active: true,
                created_at: now
            });

            // Provision the Super Admin Role Marker (CRITICAL for DBAC Rules)
            batch.set(doc(db, 'roles_super_admin', authUid), {
                uid: authUid,
                assignedAt: now,
                email: normalizedEmail
            });

            // Provision the Master Hospital Record (HQ)
            batch.set(doc(db, 'hospitals', hospitalId), {
                hospitalId: hospitalId,
                name: "Gam It Services HQ",
                slug: "gammed-hq",
                status: "active",
                subscriptionTier: "premium",
                createdAt: now
            });

            await batch.commit();

            toast.success("CEO Account Created Successfully!", {
                description: "Platform initialized. Redirecting to login..."
            });
            
            router.push('/login');
        } catch (error: any) {
            console.error("Signup error:", error);
            toast.error("Registration Failed", { 
                description: error.message || "An error occurred during account creation." 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
            <Card className="mx-auto max-w-sm w-full shadow-lg border-t-4 border-t-primary">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl text-center font-bold">Platform Initializer</CardTitle>
                    <CardDescription className="text-center">
                        Register as the GamMed Super Admin (CEO)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignUp} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                placeholder="Dr. John Doe"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Work Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="ceo@gammed.com"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Secure Password</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                required 
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <Button type="submit" className="w-full mt-2 h-11" disabled={isLoading}>
                            {isLoading ? "Provisioning Master Account..." : "Create CEO Account"}
                        </Button>
                    </form>
                    <div className="mt-6 border-t pt-4 text-center">
                        <p className="text-[10px] text-destructive font-bold uppercase tracking-widest leading-tight">
                            Critical Security Warning:<br />
                            Delete this page (src/app/signup/page.tsx) immediately after successful registration.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}