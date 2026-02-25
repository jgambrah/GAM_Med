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
import { addPatient as addPatientAction } from '@/lib/actions';
import { mockPricingTables, allPatients as initialPatients } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';
import { Patient } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { AlertCircle } from 'lucide-react';

interface AddPatientDialogProps {
    patientToEdit?: Patient | null;
    onOpenChange?: (isOpen: boolean) => void;
    onPatientAdded?: (newPatient: Patient) => void;
    onPatientUpdated?: () => void;
}

export function AddPatientDialog({
  patientToEdit,
  onOpenChange,
  onPatientAdded,
  onPatientUpdated,
}: AddPatientDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(!!patientToEdit);
  const [allPatients] = useLocalStorage<Patient[]>('patients', initialPatients);
  const isEditing = !!patientToEdit;

  const form = useForm<z.infer<typeof PatientSchema>>({
    resolver: zodResolver(PatientSchema),
    defaultValues: isEditing && patientToEdit ? {
        hospitalId: patientToEdit.hospitalId,
        mrn: patientToEdit.mrn,
        title: patientToEdit.title,
        firstName: (patientToEdit as any).firstName || patientToEdit.first_name,
        lastName: (patientToEdit as any).lastName || patientToEdit.last_name,
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

  const isTemporary = form.watch('isTemporary');

   React.useEffect(() => {
    if (patientToEdit) {
      setOpen(true);
      form.reset({
        hospitalId: patientToEdit.hospitalId,
        mrn: patientToEdit.mrn,
        title: patientToEdit.title,
        firstName: (patientToEdit as any).firstName || patientToEdit.first_name,
        lastName: (patientToEdit as any).lastName || patientToEdit.last_name,
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
    // 1. Handle Temporary ID generation if MRN is missing
    let finalMrn = values.mrn?.trim().toUpperCase() || '';
    if (values.isTemporary && !finalMrn) {
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
        finalMrn = `TEMP_${dateStr}_${randomStr}`;
    }

    if (!finalMrn) {
        toast.error("Validation Error", { description: "Medical Record Number (MRN) is required unless this is an emergency registration." });
        return;
    }
    
    // 2. CONSTRUCT COMPOSITE DOCUMENT ID
    const hospitalId = values.hospitalId || user?.hospitalId || 'hosp-1';
    const customPatientId = `${hospitalId}_MRN${finalMrn}`;

    if (isEditing) {
      console.log('Updating patient:', values);
      toast.success('Patient updated successfully (simulated).');
      if (onPatientUpdated) onPatientUpdated();
    } else {
      // 3. ATOMIC UNIQUENESS CHECK
      const existingPatient = allPatients.find(p => p.patient_id === customPatientId);
      
      if (existingPatient) {
          toast.error("Duplicate Record", {
              description: `A patient with MRN ${finalMrn} is already registered at this hospital.`
          });
          return;
      }

      // 4. CALL SERVER ACTION
      const result = await addPatientAction({ ...values, mrn: finalMrn, hospitalId });
      
      if (!result.success) {
        toast.error(`Error: ${result.message || 'Failed to add patient.'}`);
        return;
      }

      toast.success(values.isTemporary ? 'Emergency record created.' : 'Patient registered successfully.', {
          description: `Generated Record ID: ${customPatientId}`
      });

      // 5. DATA PREPARATION: Prepare searchable normalized fields
      const fullName = `${values.firstName} ${values.lastName}`;
      const fullNameLowercase = fullName.toLowerCase();
      const phoneSearch = values.contact.primaryPhone.replace(/\D/g, '');

      const newPatient: Patient = {
        patient_id: customPatientId,
        hospitalId: hospitalId,
        mrn: finalMrn,
        title: values.title ?? "",
        first_name: values.firstName,
        last_name: values.lastName,
        full_name: fullName,
        full_name_lowercase: fullNameLowercase, // Store for case-insensitive prefix search
        phone_search: phoneSearch, // Store for high-performance digits-only lookup
        dob: values.dob,
        gender: values.gender,
        maritalStatus: values.maritalStatus,
        occupation: values.occupation,
        patientType: values.patientType,
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
            expiry_date: values.insurance?.expiryDate || '', // FIXED: Use camelCase source from values
            isActive: true,
        },
        is_admitted: false,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isTemporary: values.isTemporary,
        otherNames: values.otherNames,
        ghanaCardId: values.ghanaCardId,
      };
      if (onPatientAdded) {
        onPatientAdded(newPatient);
      }
    }

    handleOpenChange(false);
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Patient Details' : 'Register New Patient'}</DialogTitle>
          <DialogDescription>
            {isEditing ? `Editing record for ${patientToEdit?.full_name}` : 'Fill in the details below to add a new patient. The record will be unique to your facility.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="mrn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medical Record Number (MRN)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 58229" {...field} disabled={isTemporary} />
                      </FormControl>
                      <FormDescription>Must be unique within your hospital.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                        <FormLabel className="text-yellow-800">
                            No MRN available (Emergency)
                        </FormLabel>
                        <FormDescription className="text-yellow-700/80">
                            A temporary ID will be generated. You must reconcile this later.
                        </FormDescription>
                        </div>
                    </FormItem>
                    )}
                />
              </div>

              <h4 className="text-lg font-medium">Personal Information</h4>
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
                      <FormLabel>Other Names (Optional)</FormLabel>
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
                      <FormLabel>Ghana Card ID (Optional)</FormLabel>
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
                      <FormLabel>Marital Status (Optional)</FormLabel>
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
                  name="occupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Occupation (Optional)</FormLabel>
                      <Input {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="patientType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient Type</FormLabel>
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

              <h4 className="text-lg font-medium">Contact & Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="contact.primaryPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+233..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="contact.alternatePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alternate Phone (Optional)</FormLabel>
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
                      <FormLabel>Email (Optional)</FormLabel>
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
              
              <h4 className="text-lg font-medium">Emergency Contact</h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="emergencyContact.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
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
              
              <h4 className="text-lg font-medium">Insurance Details (Optional)</h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="insurance.providerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider Name</FormLabel>
                      <FormControl>
                        <Input placeholder="NHIS" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="insurance.policyNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Policy Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="insurance.expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                        <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                        <FormLabel>
                            Patient Consent
                        </FormLabel>
                        <FormDescription>
                            I consent to the collection and processing of my personal and health data for the purpose of receiving medical care, in accordance with the Data Protection Act, 2012 (Act 843).
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
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Register Patient')}
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
        <Button>Add New Patient</Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}