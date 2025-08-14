
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Patient } from '@/lib/types';
import { VitalsTab } from '../../patients/[patientId]/components/vitals-tab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClinicalNotesTab } from '../../patients/[patientId]/components/clinical-notes-tab';
import { MedicationsTab } from '../../patients/[patientId]/components/medications-tab';
import { mockNotes, mockCarePlans } from '@/lib/data';
import { AddNoteDialog } from '../../patients/[patientId]/components/clinical-notes-tab';
import { CarePlanTab } from '../../patients/[patientId]/components/care-plan-tab';

interface PatientVitalsPaneProps {
  patient: Patient;
}

/**
 * == Conceptual UI: Nurse's Patient View ==
 * This component is a specialized version of the full EHR, tailored for the nursing workflow.
 * It's the main content pane in the Nursing Station workbench.
 *
 * Key Features:
 * - **Context-Driven:** It displays data for the patient selected in the `NurseWorklist`.
 * - **Task-Oriented Tabs:** The tabs are ordered based on a nurse's typical priorities:
 *   1. `Vitals`: The most frequent task. This tab is the default and contains the form for
 *      logging new vital signs.
 *   2. `Medications`: Shows the patient's medication schedule and allows for logging administration.
 *   3. `Notes`: Provides access to clinical notes for context.
 * - **Focused Actions:** Includes an "Add Note" button for quick documentation.
 *
 * This focused design reduces cognitive load and allows nurses to perform their core
 * duties more efficiently without navigating through less relevant parts of the full EHR.
 */
export function PatientVitalsPane({ patient }: PatientVitalsPaneProps) {
  const carePlan = mockCarePlans.find(cp => cp.patientId === patient.patient_id);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>{patient.full_name}</CardTitle>
                <CardDescription>Patient ID: {patient.patient_id}</CardDescription>
            </div>
            <AddNoteDialog patientId={patient.patient_id} />
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <Tabs defaultValue="vitals" className="h-full flex flex-col">
          <TabsList>
            <TabsTrigger value="vitals">Vitals</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="care-plan">Care Plan</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
          <ScrollArea className="flex-grow mt-4 p-1">
            <TabsContent value="vitals">
              <VitalsTab patientId={patient.patient_id} />
            </TabsContent>
            <TabsContent value="medications">
              <MedicationsTab patientId={patient.patient_id} />
            </TabsContent>
            <TabsContent value="care-plan">
              <CarePlanTab carePlan={carePlan} />
            </TabsContent>
            <TabsContent value="notes">
              <ClinicalNotesTab patientId={patient.patient_id} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
