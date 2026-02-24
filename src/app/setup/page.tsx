'use client';

import { initializeFirebase } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
    const [status, setStatus] = useState('Click the button below to initialize the GamMed Master Account.');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { auth, firestore: db } = initializeFirebase();

    const createSuperAdmin = async () => {
        const email = "ceo@gammed.com"; 
        const password = "YourSecretPassword123"; // You should change this after login
        
        setIsLoading(true);
        setStatus('Initializing GamMed HQ and provisioning Super Admin...');

        try {
            // 1. Create the user in Firebase Auth
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCred.user.uid;

            // 2. Define the SaaS identification pattern
            const hospitalId = 'GAMMED_HQ';
            const userDocId = `${hospitalId}_${email.toLowerCase()}`;

            // 3. Create the user document in Firestore (The "God Mode" profile)
            await setDoc(doc(db, 'users', userDocId), {
                uid: uid,
                email: email.toLowerCase(),
                name: "GamMed CEO",
                role: 'super_admin',
                hospitalId: hospitalId,
                is_active: true,
                created_at: new Date().toISOString()
            });

            // 4. Create the Hospital Master Record for the platform owner
            await setDoc(doc(db, 'hospitals', hospitalId), {
                hospitalId: hospitalId,
                name: "Gam It Services HQ",
                slug: "gammed-hq",
                status: "active",
                subscriptionTier: "premium",
                createdAt: new Date().toISOString()
            });

            setStatus('SUCCESS! Super Admin account created and HQ initialized. You can now login. IMPORTANT: DELETE THIS FILE (src/app/setup/page.tsx) IMMEDIATELY.');
            
            // Redirect after a short delay
            setTimeout(() => {
                router.push('/login');
            }, 3000);

        } catch (error: any) {
            console.error(error);
            setStatus('ERROR: ' + error.message);
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-10">
            <div className="w-full max-w-md space-y-8 text-center border p-8 rounded-xl bg-slate-900 shadow-2xl border-blue-500/20">
                <h1 className="text-4xl font-extrabold tracking-tight">GamMed System</h1>
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-blue-400">Master Initialization</h2>
                    <p className="text-slate-400">{status}</p>
                </div>
                <button 
                    onClick={createSuperAdmin}
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white py-4 rounded-lg font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                    {isLoading ? 'Processing...' : 'Initialize Super Admin Account'}
                </button>
                <p className="text-xs text-slate-500 italic pt-4">
                    Note: This will use the email "ceo@gammed.com".
                </p>
            </div>
        </div>
    );
}
