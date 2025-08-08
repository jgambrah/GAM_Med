'use client';

import { Patient } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DemographicsTabProps {
  patient: Patient;
}

const DetailItem = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base font-semibold">{value || 'N/A'}</p>
    </div>
);

export function DemographicsTab({ patient }: DemographicsTabProps) {
  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DetailItem label="First Name" value={patient.first_name} />
                <DetailItem label="Last Name" value={patient.last_name} />
                <DetailItem label="Date of Birth" value={patient.dob} />
                <DetailItem label="Gender" value={patient.gender} />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className='space-y-4'>
                    <DetailItem label="Phone Number" value={patient.contact.phone} />
                    <DetailItem label="Email Address" value={patient.contact.email} />
                </div>
                 <div className='space-y-4'>
                    <DetailItem label="Address" value={`${patient.contact.address.street}, ${patient.contact.address.city}, ${patient.contact.address.region}`} />
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DetailItem label="Name" value={patient.emergency_contact.name} />
                <DetailItem label="Relationship" value={patient.emergency_contact.relationship} />
                <DetailItem label="Phone Number" value={patient.emergency_contact.phone} />
            </CardContent>
        </Card>

         <Card>
            <CardHeader>
                <CardTitle>Insurance Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DetailItem label="Provider" value={patient.insurance?.provider_name} />
                <DetailItem label="Policy Number" value={patient.insurance?.policy_number} />
                <DetailItem label="Expiry Date" value={patient.insurance?.expiry_date} />
            </CardContent>
        </Card>
    </div>
  );
}
