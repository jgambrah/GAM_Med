
'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth as useGlobalAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useFirestore, useAuth } from "@/firebase";
import { toast } from "@/hooks/use-toast";

/**
 * == SaaS-Ready Role-Based Login ==
 * 
 * 1. Dynamic Discovery: Fetches active hospital tenants from Firestore.
 * 2. Tenant-First Verification: Checks membership via {hospitalId}_{email} ID pattern.
 * 3. Secure Auth: Performs Firebase Auth sign-in.
 * 4. Token Refresh: Forces a refresh to fetch the latest Custom Claims (hospitalId, role).
 */
export default function LoginPage() {
    const { setUser } = useGlobalAuth();
    const router = useRouter();
    const db = useFirestore();
    const auth = useAuth();

    const [hospitals, setHospitals] = React.useState<{id: string, name: string}[]>([]);
    const [selectedHospitalId, setSelectedHospitalId] = React.useState('');
    const [email, setEmail] = React.useState(''); 
    const [password, setPassword] = React.useState(''); 
    const [isLoading, setIsLoading] = React.useState(false);

    // 1. FETCH ACTIVE HOSPITALS (SaaS Discovery)
    React.useEffect(() => {
        const fetchHospitals = async () => {
            try {
                const q = query(collection(db, "hospitals"), where("status", "==", "active"));
                const querySnapshot = await getDocs(q);
                const docs = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name
                }));
                const sortedDocs = docs.sort((a, b) => a.id === 'GAMMED_HQ' ? -1 : 1);
                setHospitals(sortedDocs);
                if (sortedDocs.length > 0) setSelectedHospitalId(sortedDocs[0].id);
            } catch (error) {
                console.error("Error fetching hospitals:", error);
                setHospitals([
                    { id: 'GAMMED_HQ', name: 'GamMed Platform Operations' },
                    { id: 'hosp-1', name: 'City General Hospital' }
                ]);
                setSelectedHospitalId('GAMMED_HQ');
            }
        };
        fetchHospitals();
    }, [db]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedHospitalId) return toast.error("Please select a hospital");
        
        setIsLoading(true);
        const normalizedEmail = email.toLowerCase().trim();
        const userDocId = `${selectedHospitalId}_${normalizedEmail}`;

        try {
            // 2. STEP A: VERIFY TENANT MEMBERSHIP
            const userRef = doc(db, 'users', userDocId);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                throw new Error("You do not have an account at this facility.");
            }

            const userData = userSnap.data();
            if (!userData.is_active) {
                throw new Error("Your account is disabled. Contact your administrator.");
            }

            // 3. STEP B: AUTHENTICATE
            const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
            
            // 4. STEP C: FORCE REFRESH TOKEN to get Custom Claims immediately
            await userCredential.user.getIdTokenResult(true);
            
            // 5. STEP D: SYNC GLOBAL STATE
            setUser({
                uid: userCredential.user.uid,
                ...userData
            } as any);

            toast.success("Login Successful", {
                description: `Welcome back to ${hospitals.find(h => h.id === selectedHospitalId)?.name || 'GamMed'}`
            });

            // 6. ROLE-BASED REDIRECTION
            const routes = {
                super_admin: '/dashboard/super-admin',
                director: '/dashboard/admin', 
                admin: '/dashboard/admin',
                doctor: '/dashboard/my-practice',
                nurse: '/dashboard/nursing',
                patient: '/dashboard/my-records'
            };
            
            router.push(routes[userData.role as keyof typeof routes] || '/dashboard');

        } catch (error: any) {
            console.error("Login error:", error);
            toast.error("Access Denied", {
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
                <CardTitle className="text-2xl text-center font-bold">GamMed SaaS</CardTitle>
                <CardDescription className="text-center">
                    Secure Hospital Management Portal
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="hospital">Facility / Branch</Label>
                        <Select value={selectedHospitalId} onValueChange={setSelectedHospitalId}>
                            <SelectTrigger id="hospital">
                                <SelectValue placeholder="Select your facility" />
                            </SelectTrigger>
                            <SelectContent>
                                {hospitals.length > 0 ? hospitals.map(h => (
                                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                                )) : (
                                    <SelectItem value="loading" disabled>Loading facilities...</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Work Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@hospital.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Password</Label>
                            <Link href="#" className="text-sm text-primary hover:underline">Forgot?</Link>
                        </div>
                        <Input 
                            id="password" 
                            type="password" 
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <Button type="submit" className="w-full mt-2" disabled={isLoading || hospitals.length === 0}>
                        {isLoading ? "Verifying..." : "Secure Login"}
                    </Button>
                </form>
                <div className="mt-4 text-center text-xs">
                    <Link href="/register-platform-owner" className="text-muted-foreground hover:text-primary">
                        Platform Partner? Register Facility
                    </Link>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
