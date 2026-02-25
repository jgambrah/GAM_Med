
'use client';

import * as React from 'react';
import { BillingTab } from '../patients/[patientId]/components/billing-tab';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function MyBillingPage() {
    const { user } = useAuth();
    
    if (!user || !user.patient_id) {
        return (
             <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Could not find patient information. Access restricted to registered patients.</p>
            </div>
        )
    }

    // Pass the user object as the patient to provide necessary context (id, type, hospitalId)
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">My Billing</h1>
                <p className="text-muted-foreground">
                    View your invoices and account summary for <strong>{user.hospitalId}</strong>.
                </p>
            </div>
            <BillingTab patient={user as any} />
        </div>
    )
}
