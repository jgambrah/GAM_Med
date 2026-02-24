'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth as useGlobalAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import * as React from 'react';
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useFirestore, useAuth } from "@/firebase";
import { toast } from "@/hooks/use-toast";

/**
 * == SaaS-Ready Zero-Config Login ==
 * 
 * This page uses "Discovery Logic":
 * 1. User enters email.
 * 2. System queries the 'users' collection to find the tenant (hospitalId) and role.
 * 3. System completes authentication and routes the user based on their specific role.
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
            // 1. DISCOVERY: Find the user's record globally by email
            // This allows us to find their hospitalId and role without them selecting it.
            const usersRef = collection(db, "users");
            const discoveryQuery = query(usersRef, where("email", "==", normalizedEmail), limit(1));
            const querySnapshot = await getDocs(discoveryQuery);

            if (querySnapshot.empty) {
                throw new Error("No account found with this email address. Please check your spelling.");
            }

            const userData = querySnapshot.docs[0].data();
            
            if (!userData.is_active) {
                throw new Error("Your account has been disabled. Please contact your administrator.");
            }

            // 2. AUTHENTICATE with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
            
            // 3. FORCE TOKEN REFRESH to ensure Custom Claims (hospitalId, role) are in the JWT
            await userCredential.user.getIdTokenResult(true);
            
            // 4. SYNC GLOBAL UI STATE
            setUser({
                uid: userCredential.user.uid,
                ...userData
            } as any);

            toast.success("Login Successful", {
                description: `Welcome back, ${userData.name}.`
            });

            // 5. SMART ROUTING
            const routes = {
                super_admin: '/dashboard/super-admin',
                director: '/dashboard/admin', 
                admin: '/dashboard/admin',
                doctor: '/dashboard/my-practice',
                nurse: '/dashboard/nursing',
                patient: '/dashboard/my-records'
            };
            
            const destination = routes[userData.role as keyof typeof routes] || '/dashboard';
            router.push(destination);

        } catch (error: any) {
            console.error("Login error:", error);
            toast.error("Login Failed", {
                description: error.message || "Invalid email or password."
            });
        } finally {
            setIsLoading(false);
        }
    }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50 p-4">
        <Card className="mx-auto max-w-sm w-full shadow-lg border-t-4 border-t-primary">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center font-bold">GamMed Login</CardTitle>
                <CardDescription className="text-center">
                    Enter your email to access your hospital portal
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
                        {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                </form>
                <div className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground">
                    <p>&copy; 2024 Gam It Services. All rights reserved.</p>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
