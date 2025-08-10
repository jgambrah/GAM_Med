
'use client';

import { Patient } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DemographicsTabProps {
  patient: Patient;
}

const DetailItem = ({ label, value }: { label: string; value?: string | null | boolean | string[] }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base font-semibold">{value === true ? 'Yes' : value === false ? 'No' : Array.isArray(value) ? value.join(', ') || 'N/A' : value || 'N/A'}</p>
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
                <DetailItem label="Title" value={patient.title} />
                <DetailItem label="First Name" value={patient.first_name} />
                <DetailItem label="Last Name" value={patient.last_name} />
                <DetailItem label="Other Names" value={patient.otherNames} />
                <DetailItem label="Date of Birth" value={patient.dob} />
                <DetailItem label="Gender" value={patient.gender} />
                <DetailItem label="Marital Status" value={patient.maritalStatus} />
                <DetailItem label="Occupation" value={patient.occupation} />
                <DetailItem label="Ghana Card ID" value={patient.ghanaCardId} />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className='space-y-4'>
                    <DetailItem label="Primary Phone" value={patient.contact.primaryPhone} />
                    <DetailItem label="Alternate Phone" value={patient.contact.alternatePhone} />
                    <DetailItem label="Email Address" value={patient.contact.email} />
                </div>
                 <div className='space-y-4'>
                    <DetailItem label="Address" value={`${patient.contact.address.street}, ${patient.contact.address.city}, ${patient.contact.address.region}, ${patient.contact.address.country}`} />
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
                <DetailItem label="Is Active?" value={patient.insurance?.isActive} />
                <DetailItem label="Expiry Date" value={patient.insurance?.expiry_date} />
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Medical History</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-medium text-muted-foreground">Allergies</h4>
                    {patient.medicalHistory?.allergies?.length ? (
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            {patient.medicalHistory.allergies.map(allergy => <li key={allergy}>{allergy}</li>)}
                        </ul>
                    ) : <p>None reported.</p>}
                </div>
                <div>
                    <h4 className="font-medium text-muted-foreground">Pre-existing Conditions</h4>
                     {patient.medicalHistory?.preExistingConditions?.length ? (
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            {patient.medicalHistory.preExistingConditions.map(condition => <li key={condition}>{condition}</li>)}
                        </ul>
                    ) : <p>None reported.</p>}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
