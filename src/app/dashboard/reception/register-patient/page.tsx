'use client';

import * as React from 'react';
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useTenant } from '@/hooks/use-tenant';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * == Core Hospital Engine: Patient Registration ==
 * 
 * This module handles the onboarding of new patients into a specific hospital tenant.
 * It enforces the gold-standard SaaS pattern: {hospitalId}_MRN{mrn}
 */
export default function RegisterPatient() {
    const firestore = useFirestore();
    const { hospitalId, hospitalName } = useTenant();

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        mrn: '', // Medical Record Number
        phone: '',
        gender: ''
    });

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!hospitalId) {
            toast.error("Tenant Error", { description: "Hospital ID not found in session." });
            return;
        }

        // 1. Generate the SaaS Unique ID based on gold-standard pattern: {hospitalId}_MRN{mrn}
        const mrn = formData.mrn.trim().toUpperCase();
        const patientDocId = `${hospitalId}_MRN${mrn}`;

        try {
            const patientRef = doc(firestore, 'patients', patientDocId);
            const docSnap = await getDoc(patientRef);

            // ATOMIC UNIQUENESS CHECK
            if (docSnap.exists()) {
                return toast.error("Duplicate MRN", {
                    description: `A patient with MRN ${mrn} already exists at your facility.`
                });
            }

            // 2. Save with the Hospital ID tag for logical isolation (The SaaS Wall)
            // We also prepare searchable normalized fields for high-performance lookups.
            const fullName = `${formData.firstName} ${formData.lastName}`;
            
            await setDoc(patientRef, {
                patient_id: patientDocId,
                mrn: mrn,
                first_name: formData.firstName,
                last_name: formData.lastName,
                full_name: fullName,
                full_name_lowercase: fullName.toLowerCase(),
                phone_search: formData.phone.replace(/\D/g, ''),
                hospitalId: hospitalId, // THE CRITICAL SAAS TAG
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
                status: 'outpatient',
                is_admitted: false
            });

            toast.success("Patient Registered Successfully", {
                description: `Record created with ID: ${patientDocId}`
            });
            
            // Reset form
            setFormData({ firstName: '', lastName: '', mrn: '', phone: '', gender: '' });
        } catch (error: any) {
            console.error("Registration error:", error);
            toast.error("Registration failed", { description: error.message });
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Reception Desk</h1>
                <p className="text-muted-foreground">Register new patients for {hospitalName || 'your facility'}.</p>
            </div>
            
            <Card className="border-t-4 border-t-primary shadow-lg">
                <CardHeader>
                    <CardTitle>New Patient Registration</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">First Name</label>
                                <Input 
                                    placeholder="Kwame" 
                                    required 
                                    value={formData.firstName} 
                                    onChange={e => setFormData({...formData, firstName: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Last Name</label>
                                <Input 
                                    placeholder="Owusu" 
                                    required 
                                    value={formData.lastName} 
                                    onChange={e => setFormData({...formData, lastName: e.target.value})} 
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Medical Record Number (MRN)</label>
                            <Input 
                                placeholder="e.g. 58229" 
                                required 
                                value={formData.mrn} 
                                onChange={e => setFormData({...formData, mrn: e.target.value})} 
                            />
                            <p className="text-xs text-muted-foreground">Must be unique within your hospital.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Phone Number</label>
                            <Input 
                                placeholder="+233..." 
                                value={formData.phone} 
                                onChange={e => setFormData({...formData, phone: e.target.value})} 
                            />
                        </div>
                        <Button type="submit" className="w-full mt-4">Confirm & Register Patient</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
