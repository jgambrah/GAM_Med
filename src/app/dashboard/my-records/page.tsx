

'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { LabResultsTab } from '../patients/[patientId]/components/lab-results-tab';
import { RadiologyTab } from '../patients/[patientId]/components/radiology-tab';
import { ImmunizationsTab } from '../patients/[patientId]/components/immunizations-tab';
import { AdmissionsHistoryTab } from '../patients/[patientId]/components/admissions-history-tab';
import { allAdmissions } from '@/lib/data';
import { MedicationsTab } from '../patients/[patientId]/components/medications-tab';

export default function MyRecordsPage() {
    const { user } = useAuth();
    
    if (!user || !user.patient_id) {
        return (
             <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Could not find patient information.</p>
            </div>
        )
    }

    const admissions = allAdmissions.filter(a => a.patient_id === user.patient_id);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">My Medical Records</h1>
                <p className="text-muted-foreground">
                    A secure, centralized view of your health history with GamMed.
                </p>
            </div>
             <Card>
                 <Tabs defaultValue="medications">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <TabsList className="h-auto flex-wrap justify-start">
                                <TabsTrigger value="medications">Medications</TabsTrigger>
                                <TabsTrigger value="labs">Lab Results</TabsTrigger>
                                <TabsTrigger value="radiology">Imaging Reports</TabsTrigger>
                                <TabsTrigger value="immunizations">Immunizations</TabsTrigger>
                                <TabsTrigger value="admissions">Visit History</TabsTrigger>
                            </TabsList>
                        </div>
                    </CardHeader>
                    <TabsContent value="medications" className="m-0">
                         <CardContent>
                            <MedicationsTab patientId={user.patient_id} />
                        </CardContent>
                    </TabsContent>
                    <TabsContent value="labs" className="m-0">
                         <CardContent>
                            <LabResultsTab />
                        </CardContent>
                    </TabsContent>
                    <TabsContent value="radiology" className="m-0">
                         <CardContent>
                           <RadiologyTab patientId={user.patient_id} />
                        </CardContent>
                    </TabsContent>
                    <TabsContent value="immunizations" className="m-0">
                        <CardContent>
                            <ImmunizationsTab patientId={user.patient_id} />
                        </CardContent>
                    </TabsContent>
                    <TabsContent value="admissions" className="m-0">
                        <CardContent>
                           <AdmissionsHistoryTab admissions={admissions} />
                        </CardContent>
                    </TabsContent>
                </Tabs>
            </Card>
        </div>
    );
}
