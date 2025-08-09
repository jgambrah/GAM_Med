
'use client';

import * as React from 'react';
import { LogOut, Bot } from 'lucide-react';
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
import { Patient } from '@/lib/types';
import { dischargePatient } from '@/lib/actions';
import { generateDischargeSummary, GenerateDischargeSummaryOutput } from '@/ai/flows/discharge-summary-flow';
import { ClinicalNote } from './clinical-notes-tab';
import { Skeleton } from '@/components/ui/skeleton';

interface DischargePatientDialogProps {
  patient: Patient;
  clinicalNotes: ClinicalNote[];
  disabled?: boolean;
}

/**
 * == Conceptual UI: Doctor's Discharge Summary Form ==
 *
 * This component serves as the primary interface for clinical staff (doctors) to initiate
 * and finalize the medical portion of a patient's discharge.
 *
 * Workflow:
 * 1.  **Trigger:** The doctor clicks the "Discharge Patient" button on the patient's record.
 * 2.  **AI Generation:** The doctor clicks "Generate Summary" to call the `generateDischargeSummary`
 *     Genkit flow, which processes clinical notes into a structured summary.
 * 3.  **Review & Sign-off:** The generated clinical summary and patient instructions are displayed
 *     for the doctor to review. Clicking "Confirm and Discharge Patient" acts as the clinical
 *     sign-off.
 * 4.  **Backend Call:** This final confirmation would ideally call the `finalizeDischargeSummary`
 *     Cloud Function. This function would save the summary and update the admission status to
 *     'Pending Discharge', officially handing off the process to the administrative/billing team.
 *
 *     For this prototype, it calls a simplified `dischargePatient` server action.
 */
export function DischargePatientDialog({ patient, clinicalNotes, disabled }: DischargePatientDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [summary, setSummary] = React.useState<GenerateDischargeSummaryOutput | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  
  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    setError(null);
    setSummary(null);
    try {
        const result = await generateDischargeSummary({ clinicalNotes });
        setSummary(result);
    } catch (e) {
        setError('Failed to generate discharge summary. Please try again.');
        console.error(e);
    } finally {
        setIsGenerating(false);
    }
  }

  const handleDischarge = async () => {
    if (!patient.current_admission_id || !summary) {
        alert("Error: Missing admission ID or summary.");
        return;
    }
    setIsSubmitting(true);
    const result = await dischargePatient(
        patient.patient_id, 
        patient.current_admission_id,
        summary.clinicalSummary,
        summary.patientInstructions
    );

    if (result.success) {
        alert('Patient has been discharged successfully (simulated).');
        setOpen(false);
        setSummary(null);
    } else {
        alert(`Error: ${result.message}`);
    }
    setIsSubmitting(false);
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
        // Reset state when dialog is closed
        setSummary(null);
        setError(null);
        setIsGenerating(false);
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={disabled}>
            <LogOut className="h-4 w-4 mr-2" />
            Discharge Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Discharge Patient: {patient.full_name}</DialogTitle>
          <DialogDescription>
            Generate an AI-powered discharge summary and confirm patient discharge.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto space-y-4 pr-6">
            {!summary && !isGenerating && (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 border-2 border-dashed rounded-lg">
                    <Bot className="h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mt-4">Generate Discharge Summary</h3>
                    <p className="text-muted-foreground mt-1">
                        Click the button below to use AI to generate a clinical summary and patient-friendly instructions based on the available clinical notes.
                    </p>
                    <Button onClick={handleGenerateSummary} className="mt-4" disabled={isGenerating}>
                        {isGenerating ? 'Generating...' : 'Generate Summary'}
                    </Button>
                    {error && <p className="text-destructive mt-2">{error}</p>}
                </div>
            )}
            
            {isGenerating && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold mb-2">Clinical Summary</h4>
                        <Skeleton className="h-48 w-full" />
                    </div>
                     <div>
                        <h4 className="font-semibold mb-2">Patient Instructions</h4>
                        <Skeleton className="h-48 w-full" />
                    </div>
                </div>
            )}

            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <h4 className="font-semibold text-lg">Clinical Summary</h4>
                        <div className="p-4 bg-muted rounded-md text-sm prose prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap font-sans">{summary.clinicalSummary}</pre>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <h4 className="font-semibold text-lg">Patient-Friendly Instructions</h4>
                         <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-sm prose prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap font-sans">{summary.patientInstructions}</pre>
                        </div>
                    </div>
                </div>
            )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleDischarge} disabled={isSubmitting || isGenerating || !summary}>
            {isSubmitting ? 'Discharging...' : 'Confirm and Discharge Patient'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
