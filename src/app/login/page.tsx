
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
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import * as React from 'react';

export default function LoginPage() {
    const { setUser } = useAuth();
    const router = useRouter();
    const [email, setEmail] = React.useState('admin@gammed.com'); // Pre-fill for demo
    const [password, setPassword] = React.useState('password'); // Pre-fill for demo
    const [mfaCode, setMfaCode] = React.useState('');
    const [step, setStep] = React.useState<'credentials' | 'mfa'>('credentials');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, you would first verify the password.
        // If correct, then check if MFA is enabled.
        console.log(`Simulating login for email: ${email}`);
        
        // For this prototype, we'll simulate that the admin user has MFA enabled.
        if (email.includes('admin')) {
            setStep('mfa');
        } else {
            // For other users, log in directly.
            router.push('/dashboard');
        }
    }
    
    const handleMfaSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, you'd verify the MFA code here.
        console.log(`Verifying MFA code: ${mfaCode}`);
        
        // After successful verification, redirect to the dashboard.
        router.push('/dashboard');
    }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50">
        <Card className="mx-auto max-w-sm">
            {step === 'credentials' ? (
                <>
                    <CardHeader>
                        <CardTitle className="text-2xl">Login</CardTitle>
                        <CardDescription>
                        Enter your email below to login to your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="grid gap-4">
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
                                    Forgot your password?
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
                            <Button type="submit" className="w-full">
                                Sign In
                            </Button>
                        </form>
                    </CardContent>
                </>
            ) : (
                 <>
                    <CardHeader>
                        <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
                        <CardDescription>
                        Enter the 6-digit code from your authenticator app.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleMfaSubmit} className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="mfa-code">Authentication Code</Label>
                                <Input
                                id="mfa-code"
                                type="text"
                                placeholder="123456"
                                required
                                value={mfaCode}
                                onChange={(e) => setMfaCode(e.target.value)}
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                Verify
                            </Button>
                        </form>
                    </CardContent>
                </>
            )}
        </Card>
    </div>
  )
}
