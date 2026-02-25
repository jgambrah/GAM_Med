
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User as UserIcon, Mail, Phone, CalendarDays, Building, GraduationCap, BadgeCheck, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format, differenceInDays, parseISO } from 'date-fns';
import { User as UserType } from '@/lib/types';
import { AddCredentialDialog } from './add-credential-dialog';

interface ProfileDetailsTabProps {
  staff: UserType;
  user: UserType | null;
  setStaff: React.Dispatch<React.SetStateAction<UserType | undefined>>;
}

const DetailItem = ({ icon: Icon, label, value, children }: { icon: React.ElementType, label: string; value?: string | null; children?: React.ReactNode }) => (
    <div>
        <div className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Icon className="h-4 w-4" />{label}</div>
        {value && <div className="text-base font-semibold ml-6">{value}</div>}
        {children && <div className="ml-6">{children}</div>}
    </div>
);

export function ProfileDetailsTab({ staff, user, setStaff }: ProfileDetailsTabProps) {
    const isSelf = staff.uid === user?.uid;
    const canEdit = user?.role === 'admin';

    const getExpiryColor = (dateString?: string) => {
        if (!dateString) return '';
        const daysToExpiry = differenceInDays(parseISO(dateString), new Date());
        if (daysToExpiry < 0) return 'text-destructive font-semibold';
        if (daysToExpiry <= 60) return 'text-yellow-600 font-semibold';
        return '';
    };

    const handleCredentialAdded = (type: 'qualifications' | 'certifications' | 'licenses', data: any) => {
        setStaff(prev => {
            if (!prev) return undefined;
            const existingCredentials = prev[type as keyof UserType] || [];
            return {
                ...prev,
                [type]: [...(existingCredentials as any[]), data],
            }
        });
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Personal & Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <DetailItem icon={UserIcon} label="Name" value={staff.name} />
                        <DetailItem icon={Mail} label="Email" value={staff.email} />
                        <DetailItem icon={Phone} label="Phone" value={staff.phoneNumber} />
                        <DetailItem icon={CalendarDays} label="Date of Birth" value={staff.dateOfBirth ? format(parseISO(staff.dateOfBirth), 'PPP') : 'N/A'} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Employment Details</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-4">
                        <DetailItem icon={Building} label="Department" value={staff.department} />
                        <DetailItem icon={UserIcon} label="Role" value={staff.role} />
                        <DetailItem icon={CalendarDays} label="Hire Date" value={staff.hireDate ? format(parseISO(staff.hireDate), 'PPP') : 'N/A'} />
                     </CardContent>
                </Card>
            </div>
             <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Qualifications & Credentials</CardTitle>
                        {canEdit && <AddCredentialDialog onCredentialAdded={handleCredentialAdded} />}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                             <h4 className="font-semibold text-md flex items-center gap-2 mb-2"><GraduationCap className="h-5 w-5" />Qualifications</h4>
                             {staff.qualifications?.length ? (
                                <ul className="list-disc pl-5 space-y-1">
                                    {staff.qualifications.map((q, i) => <li key={i}>{q.degree} - {q.institution} ({q.graduationYear})</li>)}
                                </ul>
                             ): <div className="text-sm text-muted-foreground">No qualifications on file.</div>}
                        </div>
                        <Separator />
                         <div>
                             <h4 className="font-semibold text-md flex items-center gap-2 mb-2"><BadgeCheck className="h-5 w-5" />Certifications</h4>
                             {staff.certifications?.length ? (
                                <ul className="list-disc pl-5 space-y-1">
                                    {staff.certifications.map((c, i) => (
                                         <li key={i}>{c.name} (Expires: <span className={getExpiryColor(c.expiryDate)}>{c.expiryDate ? format(parseISO(c.expiryDate), 'PPP') : 'N/A'}</span>)</li>
                                    ))}
                                </ul>
                             ): <div className="text-sm text-muted-foreground">No certifications on file.</div>}
                        </div>
                        <Separator />
                         <div>
                             <h4 className="font-semibold text-md flex items-center gap-2 mb-2"><FileText className="h-5 w-5" />Licenses</h4>
                             {staff.licenses?.length ? (
                                <ul className="list-disc pl-5 space-y-1">
                                    {staff.licenses.map((l, i) => (
                                        <li key={i}>{l.type} - {l.licenseNumber} (Expires: <span className={getExpiryColor(l.expiryDate)}>{format(parseISO(l.expiryDate), 'PPP')}</span>)</li>
                                    ))}
                                </ul>
                             ): <div className="text-sm text-muted-foreground">No licenses on file.</div>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
