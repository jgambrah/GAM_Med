
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
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, this would call Firebase Auth to sign in the user.
        // For this prototype, we'll just log the user in as the default admin.
        console.log(`Simulating login for email: ${email}`);
        
        // After successful login, redirect to the dashboard.
        router.push('/dashboard');
    }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50">
        <Card className="mx-auto max-w-sm">
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
        </Card>
    </div>
  )
}
