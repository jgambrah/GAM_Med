'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PatientSchema } from '@/lib/schemas';
import { Checkbox } from '@/components/ui/checkbox';
import { Patient } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore } from '@/firebase';
import { doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { Loader2, ShieldCheck, UserPlus, Phone, Home, HeartPulse, Shield, CreditCard, AlertTriangle, Fingerprint } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { isBefore, parseISO, startOfDay } from 'date-fns';

interface AddPatientDialogProps {
    patientToEdit?: Patient | null;
    onOpenChange?: (isOpen: boolean) => void;
    onPatientAdded?: (newPatient: Patient) => void;
    onPatientUpdated?: () => void;
}

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

export function AddPatientDialog({
  patientToEdit,
  onOpenChange,
  onPatientAdded,
  onPatientUpdated,
}: AddPatientDialogProps) {
  const { user } = useAuth();
  const db = useFirestore();
  const [open, setOpen] = React.useState(!!patientToEdit);
  const [loading, setLoading] = React.useState(false);
  const isEditing = !!patientToEdit;

  const form = useForm<z.infer<typeof PatientSchema>>({
    resolver: zodResolver(PatientSchema),
    defaultValues: isEditing && patientToEdit ? {
        hospitalId: patientToEdit.hospitalId,
        title: patientToEdit.title,
        firstName: patientToEdit.first_name,
        lastName: patientToEdit.last_name,
        otherNames: patientToEdit.otherNames || '',
        ghanaCardId: patientToEdit.ghanaCardId || '',
        dob: patientToEdit.dob,
        gender: patientToEdit.gender,
        maritalStatus: patientToEdit.maritalStatus as any,
        occupation: patientToEdit.occupation || '',
        religion: patientToEdit.religion || '',
        patientType: patientToEdit.patientType,
        nhisNumber: patientToEdit.insurance?.nhisNumber || '',
        nhisExpiryDate: patientToEdit.insurance?.nhisExpiryDate || '',
        fingerprintVerified: patientToEdit.insurance?.fingerprintVerified || false,
        contact: {
            primaryPhone: patientToEdit.contact.primaryPhone,
            alternatePhone: patientToEdit.contact.alternatePhone,
            email: patientToEdit.contact.email,
            address: patientToEdit.contact.address.street,
            city: patientToEdit.contact.address.city,
            region: patientToEdit.contact.address.region,
        },
        nextOfKin: {
            name: patientToEdit.nextOfKin?.name || '',
            relationship: patientToEdit.nextOfKin?.relationship || '',
            phone: patientToEdit.nextOfKin?.phone || ''
        },
        clinical: {
            bloodGroup: patientToEdit.clinical?.bloodGroup || '',
            genotype: patientToEdit.clinical?.genotype || '',
            allergies: patientToEdit.clinical?.allergies || ''
        },
        consent: true,
        isTemporary: patientToEdit.isTemporary || false,
    } : {
      hospitalId: user?.hospitalId || '',
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
      nhisNumber: '',
      nhisExpiryDate: '',
      fingerprintVerified: false,
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

  const patientType = form.watch('patientType');
  const nhisExpiry = form.watch('nhisExpiryDate');
  const isExpired = nhisExpiry && isBefore(parseISO(nhisExpiry), startOfDay(new Date()));

   React.useEffect(() => {
    if (patientToEdit) {
      setOpen(true);
      form.reset({
        hospitalId: patientToEdit.hospitalId,
        title: patientToEdit.title,
        firstName: patientToEdit.first_name,
        lastName: patientToEdit.last_name,
        otherNames: patientToEdit.otherNames || '',
        ghanaCardId: patientToEdit.ghanaCardId || '',
        dob: patientToEdit.dob,
        gender: patientToEdit.gender,
        maritalStatus: patientToEdit.maritalStatus as any,
        occupation: patientToEdit.occupation || '',
        religion: patientToEdit.religion || '',
        patientType: patientToEdit.patientType,
        nhisNumber: patientToEdit.insurance?.nhisNumber || '',
        nhisExpiryDate: patientToEdit.insurance?.nhisExpiryDate || '',
        fingerprintVerified: patientToEdit.insurance?.fingerprintVerified || false,
        contact: {
            primaryPhone: patientToEdit.contact.primaryPhone,
            alternatePhone: patientToEdit.contact.alternatePhone,
            email: patientToEdit.contact.email,
            address: patientToEdit.contact.address.street,
            city: patientToEdit.contact.address.city,
            region: patientToEdit.contact.address.region,
        },
        nextOfKin: {
            name: patientToEdit.nextOfKin?.name || '',
            relationship: patientToEdit.nextOfKin?.relationship || '',
            phone: patientToEdit.nextOfKin?.phone || ''
        },
        clinical: {
            bloodGroup: patientToEdit.clinical?.bloodGroup || '',
            genotype: patientToEdit.clinical?.genotype || '',
            allergies: patientToEdit.clinical?.allergies || ''
        },
        consent: true,
        isTemporary: patientToEdit.isTemporary || false,
      });
    } else if (user) {
        form.setValue('hospitalId', user.hospitalId);
    }
  }, [patientToEdit, form, user]);

  const handleOpenChange = (isOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    } else {
      setOpen(isOpen);
    }
    if (!isOpen) {
      form.reset();
    }
  };

  const onSubmit = async (values: z.infer<typeof PatientSchema>) => {
    setLoading(true);
    const hospitalId = user?.hospitalId;
    if (!hospitalId) {
        toast.error("SaaS Context Error", { description: "Hospital ID not found." });
        setLoading(false);
        return;
    }

    try {
        if (isEditing && patientToEdit) {
            const patientRef = doc(db, "patients", patientToEdit.patient_id);
            const fullName = `${values.firstName} ${values.lastName}`;
            
            await setDoc(patientRef, {
                ...values,
                patient_id: patientToEdit.patient_id,
                mrn: patientToEdit.mrn,
                first_name: values.firstName,
                last_name: values.lastName,
                full_name: fullName,
                full_name_lowercase: fullName.toLowerCase(),
                phone_search: values.contact.primaryPhone.replace(/\D/g, ''),
                insurance: {
                    provider_name: values.patientType === 'public' ? 'NHIS' : '',
                    policy_number: values.nhisNumber || '',
                    nhisNumber: values.nhisNumber || '',
                    nhisExpiryDate: values.nhisExpiryDate || '',
                    fingerprintVerified: values.fingerprintVerified,
                    isActive: !isExpired,
                },
                updated_at: new Date().toISOString(),
            }, { merge: true });

            toast.success("Patient Record Updated");
            if (onPatientUpdated) onPatientUpdated();
        } else {
            const hospitalRef = doc(db, "hospitals", hospitalId);
            const counterRef = doc(db, "hospitals", hospitalId, "counters", "patient_sequence");

            const generatedMrn = await runTransaction(db, async (transaction) => {
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

            const customPatientId = `${hospitalId}_${generatedMrn}`;
            const patientRef = doc(db, "patients", customPatientId);
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
                maritalStatus: values.maritalStatus as any,
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
                insurance: {
                    provider_name: values.patientType === 'public' ? 'NHIS' : '',
                    policy_number: values.nhisNumber || '',
                    nhisNumber: values.nhisNumber || '',
                    nhisExpiryDate: values.nhisExpiryDate || '',
                    fingerprintVerified: values.fingerprintVerified,
                    expiry_date: values.nhisExpiryDate || '',
                    isActive: !isExpired,
                },
                is_admitted: false,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                isTemporary: values.isTemporary,
            };

            await setDoc(patientRef, newPatientData);

            toast.success(`Registration Successful! MRN: ${generatedMrn}`);
            if (onPatientAdded) onPatientAdded(newPatientData);
        }

        handleOpenChange(false);
    } catch (error: any) {
        console.error("Registration Error:", error);
        toast.error("Registration Failed", { description: "An error occurred during secure ID generation." });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {!isEditing && (
            <Button className="shadow-md">
                <UserPlus className="mr-2 h-4 w-4" />
                Register New Patient
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <DialogTitle>{isEditing ? 'Edit Patient Record' : 'Full Clinical Registration'}</DialogTitle>
          </div>
          <DialogDescription>
            {isEditing 
                ? `Updating the medical chart for ${patientToEdit?.full_name}.` 
                : `Provisioning a new master patient index for ${user?.hospitalId}.`
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 px-6">
              <div className="py-6 space-y-8">
                
                {/* SYSTEM GENERATED MRN INDICATOR */}
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Medical Record Number</p>
                        <p className="text-xl font-mono font-black text-blue-900">
                            {isEditing ? patientToEdit?.mrn : "AUTO-GENERATED"}
                        </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-tighter bg-white text-blue-700">
                        Atomic Branded Sequence
                    </Badge>
                </div>

                <div className="flex items-center gap-2 px-1">
                    <FormField
                        control={form.control}
                        name="isTemporary"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-yellow-50/50 border-yellow-200">
                            <FormControl>
                            <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                            <FormLabel className="text-yellow-800 font-bold text-xs uppercase tracking-tight">
                                Temporary / Emergency Triage
                            </FormLabel>
                            <p className="text-yellow-700/80 text-[10px]">
                                Use for immediate care. Clinical details can be reconciled later.
                            </p>
                            </div>
                        </FormItem>
                        )}
                    />
                </div>

                {/* 1. PERSONAL DEMOGRAPHICS */}
                <section className="space-y-4">
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
                                    <FormLabel className="text-xs">Title</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
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
                                    <FormLabel className="text-xs">First Name</FormLabel>
                                    <FormControl><Input placeholder="e.g. Kwame" className="h-9" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                                <FormItem className="md:col-span-1">
                                    <FormLabel className="text-xs">Last Name</FormLabel>
                                    <FormControl><Input placeholder="e.g. Owusu" className="h-9" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="otherNames"
                            render={({ field }) => (
                                <FormItem className="md:col-span-1">
                                    <FormLabel className="text-xs">Other Names</FormLabel>
                                    <FormControl><Input placeholder="Middle names" className="h-9" {...field} /></FormControl>
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
                                    <FormLabel className="text-xs">Gender</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
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
                                    <FormLabel className="text-xs">Date of Birth</FormLabel>
                                    <FormControl><Input type="date" className="h-9" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="maritalStatus"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Marital Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
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
                            name="religion"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Religion</FormLabel>
                                    <FormControl><Input placeholder="Christianity, Islam..." className="h-9" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="occupation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Occupation</FormLabel>
                                    <FormControl><Input placeholder="Job title" className="h-9" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </section>

                {/* 2. IDENTIFICATION & PATIENT TYPE */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-bold">
                        <ShieldCheck className="h-4 w-4" />
                        <h4 className="text-sm uppercase tracking-widest">2. Identification & Type</h4>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="ghanaCardId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Ghana Card ID (NIA)</FormLabel>
                                    <FormControl><Input placeholder="GHA-XXXXXXXXX-X" className="h-9 font-mono" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="patientType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Billing Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select tier" /></SelectTrigger></FormControl>
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

                {/* 3. INSURANCE & COVERAGE (Conditional for NHIS) */}
                {patientType === 'public' && (
                    <section className="space-y-4 p-4 rounded-xl border border-blue-200 bg-blue-50/30">
                        <div className="flex items-center gap-2 text-blue-700 font-bold">
                            <CreditCard className="h-4 w-4" />
                            <h4 className="text-sm uppercase tracking-widest">3. Insurance & Coverage (NHIS)</h4>
                        </div>
                        <Separator className="bg-blue-200" />
                        
                        {isExpired && (
                            <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-3 text-red-700 text-xs font-bold animate-pulse">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <span>ATTENTION: NHIS Card is expired. Verify validity before treatment.</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="nhisNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">NHIS Number</FormLabel>
                                        <FormControl><Input placeholder="8-digit NHIS ID" className="h-9 bg-white" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="nhisExpiryDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">NHIS Expiry Date</FormLabel>
                                        <FormControl><Input type="date" className="h-9 bg-white" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                        <FormField
                            control={form.control}
                            name="fingerprintVerified"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-white p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-xs flex items-center gap-2">
                                            <Fingerprint className="h-3 w-3 text-blue-600" />
                                            Biometric Verification
                                        </FormLabel>
                                        <FormDescription className="text-[10px]">Was fingerprint verified at the kiosk?</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </section>
                )}

                {/* 4. CONTACT INFORMATION */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-bold">
                        <Phone className="h-4 w-4" />
                        <h4 className="text-sm uppercase tracking-widest">{patientType === 'public' ? '4' : '3'}. Contact Information</h4>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="contact.primaryPhone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Primary Phone</FormLabel>
                                    <FormControl><Input placeholder="+233..." className="h-9" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="contact.email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Email Address</FormLabel>
                                    <FormControl><Input type="email" placeholder="patient@example.com" className="h-9" {...field} /></FormControl>
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
                                <FormLabel className="text-xs">Residential Address</FormLabel>
                                <FormControl><Textarea placeholder="House number, Street name, Landmark..." className="min-h-[80px]" {...field} /></FormControl>
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
                                    <FormLabel className="text-xs">City / Town</FormLabel>
                                    <FormControl><Input placeholder="Accra" className="h-9" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="contact.region"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Region</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select region" /></SelectTrigger></FormControl>
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

                {/* 5. EMERGENCY CONTACT */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-bold">
                        <Home className="h-4 w-4" />
                        <h4 className="text-sm uppercase tracking-widest">{patientType === 'public' ? '5' : '4'}. Emergency Contact</h4>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="nextOfKin.name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Full Name</FormLabel>
                                    <FormControl><Input className="h-9" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="nextOfKin.relationship"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Relationship</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
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
                                    <FormLabel className="text-xs">Contact Number</FormLabel>
                                    <FormControl><Input className="h-9" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </section>

                {/* 6. CLINICAL BASELINE */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-bold">
                        <HeartPulse className="h-4 w-4" />
                        <h4 className="text-sm uppercase tracking-widest">{patientType === 'public' ? '6' : '5'}. Clinical Baseline</h4>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="clinical.bloodGroup"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Blood Group</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
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
                                    <FormLabel className="text-xs">Genotype</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
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
                                <FormLabel className="text-xs">Known Allergies</FormLabel>
                                <FormControl><Textarea placeholder="e.g. Penicillin, Peanuts..." className="min-h-[80px]" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </section>

                <FormField
                    control={form.control}
                    name="consent"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border p-6 bg-slate-50">
                        <FormControl>
                        <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                        <FormLabel className="font-black uppercase text-[10px] tracking-widest text-slate-900">
                            Clinical Data Consent
                        </FormLabel>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            I consent to the collection and processing of my health data for medical purposes, in accordance with the Data Protection Act, 2012 (Act 843) of Ghana.
                        </p>
                        <FormMessage />
                        </div>
                    </FormItem>
                    )}
                />
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 border-t bg-muted/10">
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 min-w-[160px] font-bold shadow-lg">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : (isEditing ? 'Update Chart' : 'Finalize & Register')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
