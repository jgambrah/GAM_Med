
'use client';

import * as React from 'react';
import Link from "next/next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth as useGlobalAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useFirestore, useAuth } from "@/firebase";
import { toast } from "@/hooks/use-toast";
import { RequestDemoDialog } from '@/components/auth/RequestDemoDialog';
import { Loader2 } from 'lucide-react';

/**
 * == Enterprise SaaS Login (The Handshake) ==
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
             * This pulls the server-side custom claims into the client session immediately.
             */
            if (userCredential.user) {
                await userCredential.user.getIdToken(true);
            }

            // 3. Propagation Delay: Ensure global identity sync
            await new Promise(resolve => setTimeout(resolve, 800));

            /**
             * == USER DISCOVERY (SEARCH BY UID) ==
             * Since our document IDs are composite (hospital_email), we must query for the profile
             * where the 'uid' field matches Marcus's Auth ID.
             */
            if (!auth.currentUser) throw new Error("Authentication failed.");
            
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("uid", "==", auth.currentUser.uid));
            const querySnap = await getDocs(q);

            if (querySnap.empty) {
                throw new Error("Account found but profile missing. Please contact platform support.");
            }

            const userData = querySnap.docs[0].data();
            
            if (!userData.is_active) {
                throw new Error("Your account has been disabled. Please contact your administrator.");
            }

            // Set global auth state
            setUser({
                uid: auth.currentUser.uid,
                ...userData
            } as any);

            toast.success("Login Successful", {
                description: `Welcome back, ${userData.name}.`
            });

            // 5. Success! Route correctly based on the fresh Identity Stamp.
            if (userData.role === 'super_admin') {
                router.push('/dashboard/super-admin/pulse');
            } else {
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
            <Card className="shadow-lg border-t-4 border-t-primary overflow-hidden">
                <CardHeader className="space-y-1 bg-white border-b">
                    <CardTitle className="text-2xl text-center font-bold">GamMed Sign In</CardTitle>
                    <CardDescription className="text-center text-xs uppercase font-black tracking-widest text-muted-foreground">
                        Secure Hospital Portal
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleLogin} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Work Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@facility.com"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                className="bg-muted/20"
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <Link href="#" className="text-xs font-bold text-primary hover:underline">Reset?</Link>
                            </div>
                            <Input 
                                id="password" 
                                type="password" 
                                required 
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                className="bg-muted/20"
                            />
                        </div>
                        <Button type="submit" className="w-full mt-2 h-11 font-bold shadow-md" disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Sign In"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
            
            <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground font-medium italic">New healthcare facility interested in GamMed?</p>
                <RequestDemoDialog />
                <div className="mt-6 border-t pt-4 text-center text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-40">
                    <p>&copy; 2024 Gam It Services</p>
                </div>
            </div>
        </div>
    </div>
  );
}
