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
import { PatientSchema } from '@/lib/schemas';
import { mockPricingTables } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';
import { Patient } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore } from '@/firebase';
import { doc, runTransaction, serverTimestamp, setDoc, collection } from 'firebase/firestore';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AddPatientDialogProps {
    patientToEdit?: Patient | null;
    onOpenChange?: (isOpen: boolean) => void;
    onPatientAdded?: (newPatient: Patient) => void;
    onPatientUpdated?: () => void;
}

/**
 * == Enterprise Patient Onboarding: Atomic ID Generation ==
 * 
 * This component handles the registration of new patients.
 * It implements the "Counter Pattern" using Firestore Transactions to ensure
 * every patient receives a unique, sequential MRN (Medical Record Number).
 * Manual entry is disabled to prevent clinical duplicates.
 */
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
        mrn: patientToEdit.mrn,
        title: patientToEdit.title,
        firstName: patientToEdit.first_name,
        lastName: patientToEdit.last_name,
        otherNames: patientToEdit.otherNames || '',
        ghanaCardId: patientToEdit.ghanaCardId || '',
        dob: patientToEdit.dob,
        gender: patientToEdit.gender,
        maritalStatus: patientToEdit.maritalStatus,
        occupation: patientToEdit.occupation,
        patientType: patientToEdit.patientType,
        contact: {
            primaryPhone: patientToEdit.contact.primaryPhone,
            alternatePhone: patientToEdit.contact.alternatePhone,
            email: patientToEdit.contact.email,
            address: {
                street: patientToEdit.contact.address.street,
                city: patientToEdit.contact.address.city,
                region: patientToEdit.contact.address.region,
            }
        },
        emergencyContact: {
            name: patientToEdit.emergency_contact.name,
            relationship: patientToEdit.emergency_contact.relationship,
            phone: patientToEdit.emergency_contact.phone
        },
        insurance: {
            providerName: patientToEdit.insurance?.provider_name,
            policyNumber: patientToEdit.insurance?.policy_number,
            expiryDate: patientToEdit.insurance?.expiry_date,
        },
        consent: true,
        isTemporary: patientToEdit.isTemporary || false,
    } : {
      hospitalId: user?.hospitalId || '',
      mrn: '',
      title: '',
      firstName: '',
      lastName: '',
      otherNames: '',
      ghanaCardId: '',
      dob: '',
      gender: undefined,
      maritalStatus: undefined,
      occupation: '',
      patientType: "private",
      contact: {
        primaryPhone: '',
        alternatePhone: '',
        email: '',
        address: {
          street: '',
          city: '',
          region: '',
        },
      },
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
      },
      insurance: {
        providerName: '',
        policyNumber: '',
        expiryDate: '',
      },
      consent: false,
      isTemporary: false,
    },
  });

   React.useEffect(() => {
    if (patientToEdit) {
      setOpen(true);
      form.reset({
        hospitalId: patientToEdit.hospitalId,
        mrn: patientToEdit.mrn,
        title: patientToEdit.title,
        firstName: patientToEdit.first_name,
        lastName: patientToEdit.last_name,
        otherNames: patientToEdit.otherNames || '',
        ghanaCardId: patientToEdit.ghanaCardId || '',
        dob: patientToEdit.dob,
        gender: patientToEdit.gender,
        maritalStatus: patientToEdit.maritalStatus,
        occupation: patientToEdit.occupation,
        patientType: patientToEdit.patientType,
        contact: {
            primaryPhone: patientToEdit.contact.primaryPhone,
            alternatePhone: patientToEdit.contact.alternatePhone,
            email: patientToEdit.contact.email,
            address: {
                street: patientToEdit.contact.address.street,
                city: patientToEdit.contact.address.city,
                region: patientToEdit.contact.address.region,
            }
        },
        emergencyContact: {
            name: patientToEdit.emergency_contact.name,
            relationship: patientToEdit.emergency_contact.relationship,
            phone: patientToEdit.emergency_contact.phone
        },
        insurance: {
            providerName: patientToEdit.insurance?.provider_name,
            policyNumber: patientToEdit.insurance?.policy_number,
            expiryDate: patientToEdit.insurance?.expiry_date,
        },
        consent: true,
        isTemporary: patientToEdit.isTemporary || false,
      });
    } else {
        setOpen(false);
        if (user) {
            form.setValue('hospitalId', user.hospitalId);
        }
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
                updated_at: new Date().toISOString(),
            }, { merge: true });

            toast.success("Patient Record Updated");
            if (onPatientUpdated) onPatientUpdated();
        } else {
            // 1. References for the Atomic Transaction
            const hospitalRef = doc(db, "hospitals", hospitalId);
            const counterRef = doc(db, "hospitals", hospitalId, "counters", "patient_sequence");

            // 2. RUN THE TRANSACTION TO GET THE BRANDED SEQUENTIAL ID
            const generatedMrn = await runTransaction(db, async (transaction) => {
                // A. Get Facility Prefix (e.g., MMH)
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
            const patientRef = doc(db, "patients", customPatientId);
            const fullName = `${values.firstName} ${values.lastName}`;

            const newPatientData: Patient = {
                patient_id: customPatientId,
                hospitalId: hospitalId,
                mrn: generatedMrn, 
                title: values.title ?? "",
                first_name: values.firstName,
                last_name: values.lastName,
                full_name: fullName,
                full_name_lowercase: fullName.toLowerCase(),
                phone_search: values.contact.primaryPhone.replace(/\D/g, ''),
                dob: values.dob,
                gender: values.gender,
                patientType: values.patientType,
                maritalStatus: values.maritalStatus || 'Single',
                occupation: values.occupation || '',
                ghanaCardId: values.ghanaCardId || '',
                otherNames: values.otherNames || '',
                contact: {
                    ...values.contact,
                    email: values.contact.email ?? "",
                    address: {
                        ...values.contact.address,
                        country: 'Ghana'
                    }
                },
                emergency_contact: values.emergencyContact,
                insurance: {
                    provider_name: values.insurance?.providerName || '',
                    policy_number: values.insurance?.policyNumber || '',
                    expiry_date: values.insurance?.expiry_date || '',
                    isActive: true,
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

  const dialogContent = (
    <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <DialogTitle>{isEditing ? 'Edit Patient Details' : 'Register New Patient'}</DialogTitle>
          </div>
          <DialogDescription>
            {isEditing 
                ? `Editing record for ${patientToEdit?.full_name}` 
                : `Provisioning a new patient chart for ${user?.hospitalId}. Branded MRN will be assigned.`
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              
              {/* SYSTEM GENERATED MRN DISPLAY */}
              <div className="bg-muted/50 border border-input p-3 rounded-lg flex items-center justify-between mb-4">
                  <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Medical Record Number</p>
                      <p className="text-sm font-mono font-bold text-primary">
                          {isEditing ? patientToEdit?.mrn : "AUTO-GENERATED BY SYSTEM"}
                      </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-tighter">
                      {isEditing ? "Locked Record" : "Branded Sequence"}
                  </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="isTemporary"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-yellow-50 border-yellow-200">
                        <FormControl>
                        <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                        <FormLabel className="text-yellow-800 font-bold">
                            Temporary / Emergency Record
                        </FormLabel>
                        <FormDescription className="text-yellow-700/80 text-[10px]">
                            Immediate care registration. Formal details to be reconciled later.
                        </FormDescription>
                        </div>
                    </FormItem>
                    )}
                />
              </div>

              <h4 className="text-lg font-bold border-b pb-2">Personal Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <Input placeholder="Mr, Mrs, Dr" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Kwame" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Owusu" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="otherNames"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other Names</FormLabel>
                      <Input {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="ghanaCardId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ghana Card ID</FormLabel>
                      <Input placeholder="GHA-XXXXXXXXX-X" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
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
                  name="maritalStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marital Status</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Single">Single</SelectItem>
                          <SelectItem value="Married">Married</SelectItem>
                          <SelectItem value="Divorced">Divorced</SelectItem>
                           <SelectItem value="Widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="patientType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Tier</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a pricing tier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockPricingTables.map((tier) => (
                             <SelectItem key={tier.pricingId} value={tier.pricingId}>
                               {tier.pricingId.charAt(0).toUpperCase() + tier.pricingId.slice(1)}
                             </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <h4 className="text-lg font-bold border-b pb-2 pt-4">Contact & Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="contact.primaryPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+233..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="patient@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="contact.address.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="contact.address.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Accra" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact.address.region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region</FormLabel>
                      <FormControl>
                        <Input placeholder="Greater Accra" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <h4 className="text-lg font-bold border-b pb-2 pt-4">Emergency Contact</h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="emergencyContact.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="emergencyContact.relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <FormControl>
                        <Input placeholder="Spouse" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContact.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+233..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               {!isEditing && (
                <FormField
                    control={form.control}
                    name="consent"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/5 shadow-inner">
                        <FormControl>
                        <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                        <FormLabel className="font-bold">
                            Clinical Data Consent
                        </FormLabel>
                        <FormDescription className="text-xs">
                            I consent to the collection and processing of my personal and health data for medical purposes, in accordance with the Data Protection Act, 2012 (Act 843).
                        </FormDescription>
                        <FormMessage />
                        </div>
                    </FormItem>
                    )}
                />
               )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 min-w-[120px] font-bold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : (isEditing ? 'Update Record' : 'Finalize Registration')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
  );


  if (isEditing) {
    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {dialogContent}
        </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="shadow-md">Add New Patient</Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}