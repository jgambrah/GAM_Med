
'use client';

import * as React from 'react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth as useGlobalAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useFirestore, useAuth } from "@/firebase";
import { toast } from "@/hooks/use-toast";
import { RequestDemoDialog } from '@/components/auth/RequestDemoDialog';

/**
 * == Professional SaaS Login (Discovery Flow) ==
 * 
 * Users enter only their email and password. The system automatically
 * discovers their hospital tenant and role after authentication.
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
            // 1. AUTHENTICATE with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
            
            /**
             * == CRITICAL SAAS FIX: Token Sync ==
             * When a Director is provisioned, their claims (hospitalId) are set on the server.
             * We force refresh the token here to ensure the client-side session picks up the
             * "SaaS Stamp" immediately, avoiding permission errors on first login.
             */
            await userCredential.user.getIdToken(true);

            const authUid = userCredential.user.uid;

            // 2. DISCOVERY: Find the user's profile document by UID field
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("uid", "==", authUid), limit(1));
            const querySnapshot = await getDocs(q);

            let userData;

            if (querySnapshot.empty) {
                // Try searching by email as fallback
                const emailQuery = query(usersRef, where("email", "==", normalizedEmail), limit(1));
                const emailSnapshot = await getDocs(emailQuery);
                
                if (emailSnapshot.empty) {
                    throw new Error("Auth successful, but no Firestore profile found. Please contact GamMed support.");
                }
                
                userData = emailSnapshot.docs[0].data();
            } else {
                userData = querySnapshot.docs[0].data();
            }
            
            if (!userData.is_active) {
                throw new Error("Your account has been disabled. Please contact your administrator.");
            }

            // Set global auth state
            setUser({
                uid: authUid,
                ...userData
            } as any);

            toast.success("Login Successful", {
                description: `Welcome back, ${userData.name}.`
            });

            // 3. ROLE-BASED REDIRECTION
            // Directors and Staff land on the main dashboard where the SaaS Wall is active.
            // Only the Platform Owner goes to the global Command Centre.
            if (userData.role === 'super_admin') {
                router.push('/dashboard/super-admin');
            } else {
                router.push('/dashboard');
            }

        } catch (error: any) {
            console.error("Login error:", error);
            toast.error("Login Failed", {
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
