
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Referral, Patient } from '@/lib/types';
import { format } from 'date-fns';
import { UserPlus, FileText } from 'lucide-react';
import { addPatient } from '@/lib/actions';

interface RegisterPatientFromReferralDialogProps {
  referral: Referral;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPatientRegistered: (referralId: string, newPatient: Patient) => void;
}

const DetailItem = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base font-semibold">{value || 'N/A'}</p>
    </div>
);

export function RegisterPatientFromReferralDialog({ referral, isOpen, onOpenChange, onPatientRegistered }: RegisterPatientFromReferralDialogProps) {
    const [isRegistering, setIsRegistering] = React.useState(false);

    const handleRegister = async () => {
        setIsRegistering(true);
        // This is a simplified registration. In a real app, you'd open the full
        // AddPatientDialog pre-filled with this information.
        
        const newPatient: Patient = {
            patient_id: `P-${Date.now()}`,
            first_name: referral.patientDetails.name.split(' ')[0],
            last_name: referral.patientDetails.name.split(' ').slice(1).join(' '),
            full_name: referral.patientDetails.name,
            dob: referral.patientDetails.dob,
            gender: 'Other', // Assuming default, would be in full form
            patientType: 'private', // Default
            contact: {
                primaryPhone: referral.patientDetails.phone,
                address: { street: '', city: '', region: '', country: 'Ghana' }
            },
            emergency_contact: { name: '', relationship: '', phone: '' },
            is_admitted: false,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        // Simulate server action
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        onPatientRegistered(referral.referral_id, newPatient);
        setIsRegistering(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Register Patient from Referral</DialogTitle>
                    <DialogDescription>
                        This patient does not exist in the system yet. Register them to continue.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="p-4 border rounded-lg space-y-3">
                         <DetailItem label="Patient Name" value={referral.patientDetails.name} />
                         <DetailItem label="Date of Birth" value={format(new Date(referral.patientDetails.dob), 'PPP')} />
                         <DetailItem label="Phone" value={referral.patientDetails.phone} />
                    </div>
                     <div className="p-4 border rounded-lg space-y-2 bg-muted/50">
                        <h4 className="font-semibold text-md flex items-center gap-2"><FileText className="h-4 w-4" /> Reason for Referral</h4>
                        <p className="text-sm">{referral.reasonForReferral}</p>
                     </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleRegister} disabled={isRegistering}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        {isRegistering ? 'Registering...' : 'Register Patient & Book Appointment'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
