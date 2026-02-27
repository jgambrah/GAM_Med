'use client';

import * as React from 'react';
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { doc, setDoc, runTransaction, serverTimestamp, getDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck } from 'lucide-react';

/**
 * == Core Hospital Engine: Patient Registration ==
 * 
 * This module handles the onboarding of new patients.
 * It enforces the Atomic Transaction "Counter Pattern" for chronological MRNs.
 */
export default function RegisterPatient() {
    const firestore = useFirestore();
    const { user } = useAuth();
    const hospitalId = user?.hospitalId || '';

    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        gender: 'Other'
    });

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!hospitalId) {
            toast.error("Tenant Error", { description: "Hospital ID not found in session." });
            return;
        }

        setIsLoading(true);

        try {
            // 1. References for the Atomic Transaction
            const hospitalRef = doc(firestore, "hospitals", hospitalId);
            const counterRef = doc(firestore, "hospitals", hospitalId, "counters", "patient_sequence");

            // 2. RUN THE TRANSACTION TO GET THE BRANDED SEQUENTIAL ID
            const generatedMrn = await runTransaction(firestore, async (transaction) => {
                // A. Get Facility Prefix
                const hospSnap = await transaction.get(hospitalRef);
                const prefix = hospSnap.exists() ? (hospSnap.data().prefix || 'MRN') : 'MRN';

                // B. Get and Increment Sequence
                const counterSnap = await transaction.get(counterRef);
                let nextNum = 1001; 
                if (counterSnap.exists()) {
                    nextNum = (counterSnap.data().lastValue || 1000) + 1;
                }

                // C. Update counter
                transaction.set(counterRef, { lastValue: nextNum }, { merge: true });
                
                return `${prefix}-${nextNum}`;
            });

            // 3. Create the Patient Document (SaaS Stamped)
            const customPatientId = `${hospitalId}_${generatedMrn}`;
            const patientRef = doc(firestore, 'patients', customPatientId);
            const fullName = `${formData.firstName} ${formData.lastName}`;
            
            await setDoc(patientRef, {
                patient_id: customPatientId,
                hospitalId: hospitalId,
                mrn: generatedMrn,
                first_name: formData.firstName,
                last_name: formData.lastName,
                full_name: fullName,
                full_name_lowercase: fullName.toLowerCase(),
                phone_search: formData.phone.replace(/\D/g, ''),
                contact: {
                    primaryPhone: formData.phone,
                    email: '',
                    address: { street: '', city: '', region: '', country: 'Ghana' }
                },
                emergency_contact: { name: '', relationship: '', phone: '' },
                is_admitted: false,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            toast.success(`Patient Registered Successfully! MRN: ${generatedMrn}`);
            
            // Reset form
            setFormData({ firstName: '', lastName: '', phone: '', gender: 'Other' });
        } catch (error: any) {
            console.error("Registration error:", error);
            toast.error("Registration failed", { description: "An error occurred during ID generation." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Reception Desk</h1>
                <p className="text-muted-foreground">Register new patients for your facility.</p>
            </div>
            
            <Card className="border-t-4 border-t-primary shadow-lg overflow-hidden">
                <CardHeader className="bg-muted/20 border-b">
                    <CardTitle>New Patient Registration</CardTitle>
                    <CardDescription>Logical isolation active for {hospitalId}.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleRegister} className="grid gap-6">
                        
                        {/* SYSTEM GENERATED MRN INDICATOR */}
                        <div className="bg-muted/50 border border-input p-3 rounded-lg flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold uppercase text-muted-foreground">Medical Record Number</p>
                                <p className="text-sm font-mono font-bold text-primary">AUTO-GENERATED BY SYSTEM</p>
                            </div>
                            <Badge variant="secondary" className="text-[10px] uppercase tracking-widest px-2">
                                Branded Sequence
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">First Name</label>
                                <Input 
                                    placeholder="Kwame" 
                                    required 
                                    value={formData.firstName} 
                                    onChange={e => setFormData({...formData, firstName: e.target.value})} 
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Last Name</label>
                                <Input 
                                    placeholder="Owusu" 
                                    required 
                                    value={formData.lastName} 
                                    onChange={e => setFormData({...formData, lastName: e.target.value})} 
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Phone Number</label>
                            <Input 
                                placeholder="+233..." 
                                required
                                value={formData.phone} 
                                onChange={e => setFormData({...formData, phone: e.target.value})} 
                                disabled={isLoading}
                            />
                        </div>

                        <Button type="submit" className="w-full mt-4 h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-xl" disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Finalize & Register Patient"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
            
            <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                <ShieldCheck className="text-blue-600" />
                <p className="text-[11px] text-blue-800 font-medium">
                    This registration process uses an atomic transaction to ensure sequential record numbering. No clinical data is stored in the local cache before server confirmation.
                </p>
            </div>
        </div>
    );
}
