
'use client';

import * as React from 'react';
import { Combobox } from '@/components/ui/combobox';
import { allPatients, mockDietaryProfiles } from '@/lib/data';
import { Patient, DietaryProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/use-auth';

const EditProfileSchema = z.object({
  allergies: z.string().optional(),
  restrictions: z.string().optional(),
  preferences: z.string().optional(),
});

function EditProfileDialog({ profile, onProfileUpdated }: { profile: DietaryProfile, onProfileUpdated: (updatedProfile: DietaryProfile) => void }) {
    const [open, setOpen] = React.useState(false);
    
    const form = useForm<z.infer<typeof EditProfileSchema>>({
        resolver: zodResolver(EditProfileSchema),
        defaultValues: {
            allergies: profile.allergies?.join(', '),
            restrictions: profile.restrictions?.join(', '),
            preferences: profile.preferences?.join(', '),
        },
    });

    const onSubmit = (values: z.infer<typeof EditProfileSchema>) => {
        // In a real app, this would call a server action
        const updatedProfile: DietaryProfile = {
            ...profile,
            allergies: values.allergies?.split(',').map(s => s.trim()).filter(Boolean),
            restrictions: values.restrictions?.split(',').map(s => s.trim()).filter(Boolean),
            preferences: values.preferences?.split(',').map(s => s.trim()).filter(Boolean),
        };
        onProfileUpdated(updatedProfile);
        toast.success("Dietary profile has been updated.");
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Pencil className="mr-2 h-4 w-4" /> Edit Profile
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Dietary Profile</DialogTitle>
                    <DialogDescription>
                        Use comma-separated values to list items.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="allergies"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Allergies</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="e.g., Peanuts, Shellfish" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="restrictions"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Restrictions</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="e.g., Low Sodium, Diabetic" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="preferences"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Preferences</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="e.g., Prefers spicy food" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function ProfileDetail({ label, items }: { label: string, items?: string[] }) {
    return (
        <div className="space-y-2">
            <h4 className="font-semibold text-md">{label}</h4>
            {items && items.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {items.map(item => <Badge key={item} variant="secondary">{item}</Badge>)}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">None specified.</p>
            )}
        </div>
    );
}


export function DietaryProfileManager() {
    const { user } = useAuth();
    const [selectedPatientId, setSelectedPatientId] = React.useState<string | undefined>(allPatients[0].patient_id);
    const [profiles, setProfiles] = React.useState<DietaryProfile[] | undefined>(mockDietaryProfiles);

    const patientOptions = allPatients.map(p => ({
        value: p.patient_id,
        label: `${p.full_name} (${p.patient_id})`
    }));

    const selectedProfile = profiles?.find(p => p.patientId === selectedPatientId);
    
    const handleProfileUpdated = (updatedProfile: DietaryProfile) => {
        setProfiles(prev => prev?.map(p => p.profileId === updatedProfile.profileId ? updatedProfile : p));
    }

    const handleCreateProfile = () => {
        if (!selectedPatientId) return;

        const newProfile: DietaryProfile = {
            profileId: selectedPatientId,
            patientId: selectedPatientId,
            hospitalId: user?.hospitalId || '',
        };

        setProfiles(prev => [...(prev || []), newProfile]);
        toast.success(`A new dietary profile has been created for the selected patient.`);
    }

    return (
        <div className="space-y-6">
            <div className="w-full sm:w-1/2">
                <Combobox
                    options={patientOptions}
                    value={selectedPatientId}
                    onChange={setSelectedPatientId}
                    placeholder="Search for a patient..."
                    searchPlaceholder='Search patients...'
                    notFoundText='No patient found.'
                />
            </div>
            
            {selectedProfile ? (
                 <Card>
                    <CardHeader className="flex flex-row justify-between items-center">
                        <div>
                            <CardTitle>Viewing Profile</CardTitle>
                        </div>
                        <EditProfileDialog profile={selectedProfile} onProfileUpdated={handleProfileUpdated} />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <ProfileDetail label="Allergies" items={selectedProfile.allergies} />
                        <ProfileDetail label="Restrictions" items={selectedProfile.restrictions} />
                        <ProfileDetail label="Preferences" items={selectedProfile.preferences} />
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="h-48 flex flex-col items-center justify-center text-center">
                        <p className="text-muted-foreground mb-4">No dietary profile found for the selected patient.</p>
                        <Button onClick={handleCreateProfile} disabled={!selectedPatientId}>
                            <UserPlus className="mr-2 h-4 w-4" /> Create Profile
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
