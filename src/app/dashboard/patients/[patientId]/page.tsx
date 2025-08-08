'use client';

import * as React from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Plus, LogOut } from 'lucide-react';
import { allPatients, allAdmissions } from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { DemographicsTab } from './components/demographics-tab';
import { AdmissionsHistoryTab } from './components/admissions-history-tab';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.patientId as string;

  const patient = allPatients.find((p) => p.patient_id === patientId);
  const admissions = allAdmissions.filter((a) => a.patient_id === patientId);

  if (!patient) {
    notFound();
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
         <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href="/dashboard/patients">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Link>
         </Button>
         <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
           {patient.full_name}
         </h1>
         <Badge variant={patient.is_admitted ? 'destructive' : 'secondary'} className="ml-auto sm:ml-0">
           {patient.is_admitted ? 'Admitted' : 'Outpatient'}
         </Badge>
         <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" disabled={patient.is_admitted}>
                <Plus className="h-4 w-4 mr-2" />
                Admit Patient
            </Button>
             <Button variant="destructive" size="sm" disabled={!patient.is_admitted}>
                <LogOut className="h-4 w-4 mr-2" />
                Discharge Patient
            </Button>
         </div>
       </div>

      <Tabs defaultValue="demographics">
        <TabsList>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="admissions">Admissions</TabsTrigger>
          <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="demographics" className="mt-4">
          <DemographicsTab patient={patient} />
        </TabsContent>
        <TabsContent value="admissions" className="mt-4">
           <AdmissionsHistoryTab admissions={admissions} />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader>
                <CardTitle>Clinical Notes</CardTitle>
                <CardDescription>Records of all clinical interactions and observations.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Clinical notes feature coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="billing" className="mt-4">
          <Card>
            <CardHeader>
                <CardTitle>Billing & Invoices</CardTitle>
                <CardDescription>A history of all financial transactions and invoices.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Billing feature coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
