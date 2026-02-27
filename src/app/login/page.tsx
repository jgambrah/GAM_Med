'use client';

import * as React from 'react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth as useGlobalAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useFirestore, useAuth } from "@/firebase";
import { toast } from "@/hooks/use-toast";
import { RequestDemoDialog } from '@/components/auth/RequestDemoDialog';

/**
 * == Professional SaaS Login (The Token Handshake) ==
 * 
 * Implements the "Classic Token Sync" fix to ensure custom claims (SaaS Stamps)
 * are pulled from the server into the browser immediately upon sign-in.
 */
export default function LoginPage() {
    const { setUser } = useGlobalAuth();
    const router = useRouter();
    const db = useFirestore();
    const auth = useAuth();

    const [email, setEmail] = React.useState(''); 
    const [password, setPassword] = React.useState(''); 
    const [isLoading, setIsLoading] = React.useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        const normalizedEmail = email.toLowerCase().trim();

        try {
            // 1. Sign in with Email/Password
            const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
            
            /**
             * == CRITICAL SAAS FIX: Token Sync ==
             * 2. FORCE REFRESH THE STAMP (Identity Card)
             * This pulls the server-side custom claims (baked during provisioning) into 
             * the client-side session immediately, avoiding permission errors.
             */
            if (userCredential.user) {
                await userCredential.user.getIdToken(true);
            }

            // 3. Small delay to ensure database/claims propagation is ready
            await new Promise(resolve => setTimeout(resolve, 800));

            /**
             * == USER DISCOVERY (REQUIRED SYNTAX) ==
             * 4. Find the user's profile document by UID field using exact required syntax
             */
            if (!auth.currentUser) throw new Error("Authentication failed.");
            
            const q = query(collection(db, "users"), where("uid", "==", auth.currentUser.uid));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error("Account found but profile missing. Please contact support.");
            }

            const userData = querySnapshot.docs[0].data();
            
            if (!userData.is_active) {
                throw new Error("Your account has been disabled. Please contact your administrator.");
            }

            // Set global auth state for the context provider
            setUser({
                uid: userCredential.user.uid,
                ...userData
            } as any);

            toast.success("Login Successful", {
                description: `Welcome back, ${userData.name}.`
            });

            /**
             * == REDIRECTION GUARD ==
             * 5. Success! Route correctly
             */
            if (userData.role === 'super_admin') {
                router.push('/dashboard/super-admin');
            } else {
                // Marcus and other staff go to the facility dashboard
                router.push('/dashboard');
            }

        } catch (error: any) {
            console.error("LOGIN_ERROR:", error.message);
            toast.error("Access Error", {
                description: error.message || "Invalid email or password."
            });
        } finally {
            setIsLoading(false);
        }
    };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50 p-4">
        <div className="mx-auto max-w-sm w-full space-y-6">
            <Card className="shadow-lg border-t-4 border-t-primary">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl text-center font-bold">GamMed Sign In</CardTitle>
                    <CardDescription className="text-center">
                        Access your secure hospital portal
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@facility.com"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <Link href="#" className="text-sm text-primary hover:underline">Forgot password?</Link>
                            </div>
                            <Input 
                                id="password" 
                                type="password" 
                                required 
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <Button type="submit" className="w-full mt-2 h-11" disabled={isLoading}>
                            {isLoading ? "Verifying..." : "Sign In"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
            
            <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground font-medium italic">New healthcare facility interested in GamMed?</p>
                <RequestDemoDialog />
                <div className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground">
                    <p>&copy; 2024 Gam It Services. All rights reserved.</p>
                </div>
            </div>
        </div>
    </div>
  );
}