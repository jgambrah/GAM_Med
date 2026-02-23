
'use client';

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth as useGlobalAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import * as React from 'react';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { doc, getDoc } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useFirestore, useAuth } from "@/firebase";
import { toast } from "@/hooks/use-toast";
import { mockHospitals } from "@/lib/data";

/**
 * == Multi-Tenant Role-Based Login ==
 * 
 * 1. The user selects their Hospital (Tenant).
 * 2. We use the pattern {hospitalId}_{email} to perform an O(1) lookup.
 * 3. We verify the role and status from the document.
 * 4. We sign in via Firebase Auth.
 * 5. We redirect based on the role.
 */
export default function LoginPage() {
    const { setUser } = useGlobalAuth();
    const router = useRouter();
    const db = useFirestore();
    const auth = useAuth();

    const [selectedHospitalId, setSelectedHospitalId] = React.useState('hosp-1');
    const [email, setEmail] = React.useState('admin@gammed.com'); 
    const [password, setPassword] = React.useState('password'); 
    const [isLoading, setIsLoading] = React.useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const normalizedEmail = email.toLowerCase().trim();
        
        // 1. CONSTRUCT THE MULTI-TENANT DOCUMENT ID
        const userDocId = `${selectedHospitalId}_${normalizedEmail}`;

        try {
            // 2. O(1) DIRECT LOOKUP: Fetch user profile directly by ID
            // This ensures the user belongs to the selected hospital tenant.
            const userRef = doc(db, 'users', userDocId);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                toast.error("User not found", {
                    description: "This email is not registered at the selected hospital."
                });
                setIsLoading(false);
                return;
            }

            const userData = userSnap.data();
            
            if (!userData.is_active) {
                toast.error("Account Disabled", {
                    description: "Please contact your system administrator."
                });
                setIsLoading(false);
                return;
            }

            // 3. AUTHENTICATE via Firebase Auth
            // In this MVP, we use signInWithEmailAndPassword
            // await signInWithEmailAndPassword(auth, normalizedEmail, password);
            
            // For Prototype/Demo: Simulate the success
            console.log(`Authenticated ${normalizedEmail} at ${selectedHospitalId} with role ${userData.role}`);
            setUser(userData as any);

            // 4. ROLE-BASED REDIRECTION
            toast.success("Login Successful", {
                description: `Welcome back, ${userData.name}.`
            });

            // Route based on assigned role
            switch (userData.role) {
                case 'admin':
                    router.push('/dashboard/admin');
                    break;
                case 'doctor':
                    router.push('/dashboard/my-practice');
                    break;
                case 'nurse':
                    router.push('/dashboard/nursing');
                    break;
                case 'patient':
                    router.push('/dashboard/my-records');
                    break;
                default:
                    router.push('/dashboard');
            }

        } catch (error: any) {
            console.error("Login error:", error);
            toast.error("Login Failed", {
                description: "Invalid credentials or server error."
            });
        } finally {
            setIsLoading(false);
        }
    }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50">
        <Card className="mx-auto max-w-sm w-full">
            <CardHeader>
                <CardTitle className="text-2xl text-center">GamMed Sign In</CardTitle>
                <CardDescription className="text-center">
                    Select your hospital and enter your credentials.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="hospital">Hospital / Facility</Label>
                        <Select value={selectedHospitalId} onValueChange={setSelectedHospitalId}>
                            <SelectTrigger id="hospital">
                                <SelectValue placeholder="Select hospital" />
                            </SelectTrigger>
                            <SelectContent>
                                {mockHospitals.map(h => (
                                    <SelectItem key={h.hospitalId} value={h.hospitalId}>
                                        {h.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="m@example.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="password">Password</Label>
                            <Link href="#" className="ml-auto inline-block text-sm underline">
                                Forgot password?
                            </Link>
                        </div>
                        <Input 
                            id="password" 
                            type="password" 
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  )
}
