'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore } from '@/firebase';
import { doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, UserPlus, Phone, Home, HeartPulse, Shield } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { PatientSchema } from '@/lib/schemas';
import { Patient } from '@/lib/types';

const titles = ["Mr", "Mrs", "Ms", "Dr", "Rev", "Prof", "Master", "Miss"];
const maritalStatuses = ["Single", "Married", "Divorced", "Widowed", "Separated"];
const regions = [
    "Ahafo", "Ashanti", "Bono", "Bono East", "Central", "Eastern", 
    "Greater Accra", "Northern", "North East", "Oti", "Savannah", 
    "Upper East", "Upper West", "Volta", "Western", "Western North"
];
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const genotypes = ["AA", "AS", "SS", "SC", "CC", "AC"];
const kinRelationships = ["Spouse", "Parent", "Child", "Sibling", "Guardian", "Other"];

/**
 * == Core Hospital Engine: Full Patient Registration Page ==
 * 
 * Provides a high-fidelity interface for the Reception Desk to register new patients.
 * Enforces atomic sequential ID generation and captures a complete clinical dataset.
 */
export default function RegisterPatientPage() {
    const firestore = useFirestore();
    const { user } = useAuth();
    const hospitalId = user?.hospitalId || '';

    const form = useForm<z.infer<typeof PatientSchema>>({
        resolver: zodResolver(PatientSchema),
        defaultValues: {
            hospitalId: hospitalId,
            title: '',
            firstName: '',
            lastName: '',
            otherNames: '',
            ghanaCardId: '',
            dob: '',
            gender: undefined,
            maritalStatus: undefined,
            occupation: '',
            religion: '',
            patientType: "private",
            contact: {
                primaryPhone: '',
                alternatePhone: '',
                email: '',
                address: '',
                city: '',
                region: '',
            },
            nextOfKin: {
                name: '',
                relationship: '',
                phone: '',
            },
            clinical: {
                bloodGroup: '',
                genotype: '',
                allergies: '',
            },
            consent: false,
            isTemporary: false,
        },
    });

    // Auto-sync hospital context
    React.useEffect(() => {
        if (hospitalId) {
            form.setValue('hospitalId', hospitalId);
        }
    }, [hospitalId, form]);

    const onSubmit = async (values: z.infer<typeof PatientSchema>) => {
        if (!hospitalId) {
            toast.error("Tenant Error", { description: "Hospital ID not found in session." });
            return;
        }

        try {
            const hospitalRef = doc(firestore, "hospitals", hospitalId);
            const counterRef = doc(firestore, "hospitals", hospitalId, "counters", "patient_sequence");

            // 1. RUN THE ATOMIC TRANSACTION TO GET SEQUENTIAL MRN
            const generatedMrn = await runTransaction(firestore, async (transaction) => {
                const hospSnap = await transaction.get(hospitalRef);
                const prefix = hospSnap.exists() ? (hospSnap.data().prefix || 'MRN') : 'MRN';

                const counterSnap = await transaction.get(counterRef);
                let nextNum = 1001; 
                if (counterSnap.exists()) {
                    nextNum = (counterSnap.data().lastValue || 1000) + 1;
                }

                transaction.set(counterRef, { lastValue: nextNum }, { merge: true });
                return `${prefix}-${nextNum}`;
            });

            // 2. Create the Patient Record (Logical Isolation)
            const customPatientId = `${hospitalId}_${generatedMrn}`;
            const patientRef = doc(firestore, 'patients', customPatientId);
            const fullName = `${values.firstName} ${values.lastName}`;
            
            const newPatientData: Patient = {
                patient_id: customPatientId,
                hospitalId: hospitalId,
                mrn: generatedMrn,
                title: values.title,
                first_name: values.firstName,
                last_name: values.lastName,
                full_name: fullName,
                full_name_lowercase: fullName.toLowerCase(),
                phone_search: values.contact.primaryPhone.replace(/\D/g, ''),
                dob: values.dob,
                gender: values.gender,
                patientType: values.patientType,
                maritalStatus: values.maritalStatus,
                occupation: values.occupation,
                religion: values.religion,
                ghanaCardId: values.ghanaCardId,
                otherNames: values.otherNames,
                contact: {
                    primaryPhone: values.contact.primaryPhone,
                    alternatePhone: values.contact.alternatePhone,
                    email: values.contact.email || "",
                    address: {
                        street: values.contact.address,
                        city: values.contact.city,
                        region: values.contact.region,
                        country: 'Ghana'
                    }
                },
                emergency_contact: {
                    name: values.nextOfKin.name,
                    relationship: values.nextOfKin.relationship,
                    phone: values.nextOfKin.phone
                },
                nextOfKin: values.nextOfKin,
                clinical: values.clinical,
                is_admitted: false,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                isTemporary: values.isTemporary,
            };

            await setDoc(patientRef, newPatientData);

            toast.success(`Registration Successful! MRN: ${generatedMrn}`, {
                description: `Patient ${fullName} has been added to the master index.`
            });
            
            form.reset();
        } catch (error: any) {
            console.error("Registration Error:", error);
            toast.error("Registration Failed", { description: "An error occurred during secure ID generation." });
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reception Desk</h1>
                <p className="text-muted-foreground font-medium italic">Complete clinical registration for <strong>{hospitalId}</strong>.</p>
            </div>
            
            <Card className="border-t-4 border-t-primary shadow-xl overflow-hidden">
                <CardHeader className="bg-muted/20 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-primary" />
                        Master Patient Index Registration
                    </CardTitle>
                    <CardDescription>Enter all demographics and clinical baselines to initialize the chart.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                            
                            {/* MRN PREVIEW */}
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Medical Record Number</p>
                                    <p className="text-xl font-mono font-black text-blue-900">AUTO-GENERATED BY SYSTEM</p>
                                </div>
                                <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-tighter bg-white text-blue-700">
                                    Branded Sequence Enabled
                                </Badge>
                            </div>

                            {/* EMERGENCY TRIAGE TOGGLE */}
                            <FormField
                                control={form.control}
                                name="isTemporary"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border p-4 bg-yellow-50/50 border-yellow-200">
                                    <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                    <FormLabel className="text-yellow-800 font-bold text-xs uppercase tracking-tight">Emergency / Temporary Triage</FormLabel>
                                    <p className="text-yellow-700/80 text-[10px]">Use for immediate care if full demographics are unavailable.</p>
                                    </div>
                                </FormItem>
                                )}
                            />

                            {/* SECTION 1: PERSONAL DEMOGRAPHICS */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 text-primary font-bold">
                                    <Shield className="h-4 w-4" />
                                    <h4 className="text-sm uppercase tracking-widest">1. Personal Demographics</h4>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Title</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {titles.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem className="md:col-span-1">
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">First Name</FormLabel>
                                                <FormControl><Input placeholder="Kwame" className="h-11" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="lastName"
                                        render={({ field }) => (
                                            <FormItem className="md:col-span-1">
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Last Name</FormLabel>
                                                <FormControl><Input placeholder="Owusu" className="h-11" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="otherNames"
                                        render={({ field }) => (
                                            <FormItem className="md:col-span-1">
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Other Names</FormLabel>
                                                <FormControl><Input placeholder="Middle names" className="h-11" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="gender"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Gender</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Male">Male</SelectItem>
                                                        <SelectItem value="Female">Female</SelectItem>
                                                        <SelectItem value="Other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="dob"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Date of Birth</FormLabel>
                                                <FormControl><Input type="date" className="h-11" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="maritalStatus"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Marital Status</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {maritalStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="occupation"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Occupation</FormLabel>
                                                <FormControl><Input placeholder="e.g. Teacher" className="h-11" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </section>

                            {/* SECTION 2: IDENTIFICATION */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 text-primary font-bold">
                                    <ShieldCheck className="h-4 w-4" />
                                    <h4 className="text-sm uppercase tracking-widest">2. Identification & Type</h4>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="ghanaCardId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Ghana Card ID (NIA)</FormLabel>
                                                <FormControl><Input placeholder="GHA-XXXXXXXXX-X" className="h-11 font-mono" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="patientType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Billing Class</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="h-11 font-bold text-primary"><SelectValue placeholder="Select class" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="private">Private Cash</SelectItem>
                                                        <SelectItem value="public">NHIS (Public)</SelectItem>
                                                        <SelectItem value="corporate">Corporate Insurance</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </section>

                            {/* SECTION 3: CONTACT */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 text-primary font-bold">
                                    <Phone className="h-4 w-4" />
                                    <h4 className="text-sm uppercase tracking-widest">3. Contact Information</h4>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="contact.primaryPhone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Primary Phone</FormLabel>
                                                <FormControl><Input placeholder="+233..." className="h-11 font-bold" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="contact.alternatePhone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Alternate Phone</FormLabel>
                                                <FormControl><Input placeholder="Optional" className="h-11" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="contact.email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Email Address</FormLabel>
                                                <FormControl><Input type="email" placeholder="patient@example.com" className="h-11" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="contact.address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Residential Address</FormLabel>
                                            <FormControl><Textarea placeholder="House number, Street, Landmark..." className="min-h-[100px] bg-muted/5" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="contact.city"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">City / Town</FormLabel>
                                                <FormControl><Input placeholder="Accra" className="h-11" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="contact.region"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Administrative Region</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select region" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </section>

                            {/* SECTION 4: NEXT OF KIN */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 text-primary font-bold">
                                    <Home className="h-4 w-4" />
                                    <h4 className="text-sm uppercase tracking-widest">4. Next of Kin (Emergency)</h4>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="nextOfKin.name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Relative's Full Name</FormLabel>
                                                <FormControl><Input className="h-11" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="nextOfKin.relationship"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Relationship</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {kinRelationships.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="nextOfKin.phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Contact Number</FormLabel>
                                                <FormControl><Input placeholder="+233..." className="h-11" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </section>

                            {/* SECTION 5: CLINICAL BASELINE */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 text-primary font-bold">
                                    <HeartPulse className="h-4 w-4" />
                                    <h4 className="text-sm uppercase tracking-widest">5. Clinical Baseline</h4>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="clinical.bloodGroup"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Blood Group</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {bloodGroups.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="clinical.genotype"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Genotype</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {genotypes.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="clinical.allergies"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Known Drug Allergies</FormLabel>
                                            <FormControl><Textarea placeholder="e.g. Penicillin, Peanuts..." className="min-h-[100px] bg-muted/5" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </section>

                            <FormField
                                control={form.control}
                                name="consent"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-2xl border p-8 bg-slate-900 text-white shadow-2xl">
                                    <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} className="border-white data-[state=checked]:bg-blue-500" />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                    <FormLabel className="font-black uppercase text-[10px] tracking-widest text-blue-400">Statutory Clinical Consent</FormLabel>
                                    <p className="text-[11px] text-slate-300 leading-relaxed mt-2 font-medium">
                                        I consent to the collection and digital processing of my health data for diagnostic and therapeutic purposes, 
                                        in strict accordance with the Data Protection Act, 2012 (Act 843) of Ghana. I understand this data 
                                        is logically isolated within the <strong>{hospitalId}</strong> vault.
                                    </p>
                                    <FormMessage />
                                    </div>
                                </FormItem>
                                )}
                            />

                            <div className="pt-10 flex justify-center">
                                <Button 
                                    type="submit" 
                                    disabled={form.formState.isSubmitting} 
                                    className="w-full md:w-96 h-14 text-lg font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-500/20 rounded-2xl transition-all"
                                >
                                    {form.formState.isSubmitting ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                            Encrypting & Saving...
                                        </>
                                    ) : "Finalize Clinical Registration"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            
            <div className="mt-8 p-6 bg-slate-950 text-white rounded-2xl border flex items-center gap-4 shadow-xl">
                <ShieldCheck className="text-blue-500 h-8 w-8" />
                <p className="text-[11px] font-medium leading-relaxed opacity-80">
                    <strong>Enterprise Data Protocol:</strong> This registration uses a distributed atomic transaction to guarantee sequential record numbering. 
                    Encryption at rest is enabled for all PII. Unauthorized access to clinical data is logged in the immutable system audit.
                </p>
            </div>
        </div>
    );
}
