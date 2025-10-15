
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Qualification, Certification, License } from '@/lib/types';


const QualificationSchema = z.object({
    degree: z.string().min(2, 'Degree is required.'),
    institution: z.string().min(3, 'Institution is required.'),
    graduationYear: z.coerce.number().min(1950, 'Invalid year.').max(new Date().getFullYear(), 'Year cannot be in the future.'),
});
const CertificationSchema = z.object({
    name: z.string().min(2, 'Certification name is required.'),
    issuingBody: z.string().min(2, 'Issuing body is required.'),
    issueDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Issue date is required." }),
    expiryDate: z.string().optional(),
});
const LicenseSchema = z.object({
    type: z.string().min(2, 'License type is required.'),
    licenseNumber: z.string().min(3, 'License number is required.'),
    expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Expiry date is required." }),
});

interface AddCredentialDialogProps {
  onCredentialAdded: (type: 'qualifications' | 'certifications' | 'licenses', data: any) => void;
}

function QualificationForm({ onSave }: { onSave: (data: Qualification) => void }) {
    const form = useForm<z.infer<typeof QualificationSchema>>({
        resolver: zodResolver(QualificationSchema),
    });

    const onSubmit = (values: z.infer<typeof QualificationSchema>) => {
        onSave(values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                 <FormField
                    control={form.control}
                    name="degree"
                    render={({ field }) => (
                        <FormItem><FormLabel>Degree/Qualification</FormLabel><FormControl><Input placeholder="e.g., BSc Nursing" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="institution"
                    render={({ field }) => (
                        <FormItem><FormLabel>Institution</FormLabel><FormControl><Input placeholder="e.g., University of Ghana" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="graduationYear"
                    render={({ field }) => (
                        <FormItem><FormLabel>Year of Graduation</FormLabel><FormControl><Input type="number" placeholder="e.g., 2020" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="submit">Save Qualification</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

function CertificationForm({ onSave }: { onSave: (data: Certification) => void }) {
    const form = useForm<z.infer<typeof CertificationSchema>>({
        resolver: zodResolver(CertificationSchema),
    });

    const onSubmit = (values: z.infer<typeof CertificationSchema>) => {
        onSave(values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem><FormLabel>Certification Name</FormLabel><FormControl><Input placeholder="e.g., Advanced Cardiac Life Support" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="issuingBody"
                    render={({ field }) => (
                        <FormItem><FormLabel>Issuing Body</FormLabel><FormControl><Input placeholder="e.g., American Heart Association" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="issueDate"
                        render={({ field }) => (
                            <FormItem><FormLabel>Issue Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="expiryDate"
                        render={({ field }) => (
                            <FormItem><FormLabel>Expiry Date (Optional)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )}
                    />
                </div>
                <DialogFooter>
                    <Button type="submit">Save Certification</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

function LicenseForm({ onSave }: { onSave: (data: License) => void }) {
    const form = useForm<z.infer<typeof LicenseSchema>>({
        resolver: zodResolver(LicenseSchema),
    });

    const onSubmit = (values: z.infer<typeof LicenseSchema>) => {
        onSave(values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem><FormLabel>License Type</FormLabel><FormControl><Input placeholder="e.g., Registered Nurse" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="licenseNumber"
                    render={({ field }) => (
                        <FormItem><FormLabel>License Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                        <FormItem><FormLabel>Expiry Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="submit">Save License</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}


export function AddCredentialDialog({ onCredentialAdded }: AddCredentialDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSave = (type: 'qualifications' | 'certifications' | 'licenses', data: any) => {
    onCredentialAdded(type, data);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1, -1)} has been added.`);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Credential</DialogTitle>
          <DialogDescription>
            Add a new qualification, certification, or license to this staff member's profile.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="qualification">
            <TabsList>
                <TabsTrigger value="qualification">Qualification</TabsTrigger>
                <TabsTrigger value="certification">Certification</TabsTrigger>
                <TabsTrigger value="license">License</TabsTrigger>
            </TabsList>
            <TabsContent value="qualification">
                <QualificationForm onSave={(data) => handleSave('qualifications', data)} />
            </TabsContent>
            <TabsContent value="certification">
                <CertificationForm onSave={(data) => handleSave('certifications', data)} />
            </TabsContent>
            <TabsContent value="license">
                <LicenseForm onSave={(data) => handleSave('licenses', data)} />
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
