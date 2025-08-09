
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface DischargePatientDialogProps {
  patient: Patient;
  clinicalNotes: ClinicalNote[];
  disabled?: boolean;
}

/**
 * == Conceptual UI: Doctor's Discharge Summary Form ==
 *
 * This component serves as the primary interface for clinical staff (doctors) to initiate
 * and finalize the medical portion of a patient's discharge. It's an interactive form where
 * AI provides a draft that the doctor can then edit and approve.
 *
 * Workflow:
 * 1.  **Trigger:** The doctor clicks the "Discharge Patient" button on the patient's record.
 * 2.  **AI Generation:** The doctor clicks "Generate Summary" to call the `generateDischargeSummary`
 *     Genkit flow. The flow processes clinical notes and returns a structured summary.
 * 3.  **Review & Edit:** The generated `clinicalSummary` and `patientInstructions` are populated
 *     into editable text areas. The doctor can review, modify, and refine the content.
 * 4.  **Sign-off & Backend Call:** Clicking "Confirm and Discharge Patient" acts as the clinical
 *     sign-off. It calls the `dischargePatient` server action, sending the final, edited
 *     summary and instructions to the backend. This would then trigger the
 *     `finalizeDischargeSummary` Cloud Function, saving the summary and updating the
 *     admission status to 'Pending Discharge'.
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
    // Send the potentially edited summary from the component's state
    const result = await dischargePatient(
        patient.patient_id, 
        patient.current_admission_id,
        summary.clinicalSummary,
        summary.patientInstructions
    );

    if (result.success) {
        alert('Patient has been discharged successfully (simulated).');
        handleOpenChange(false);
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
            Generate and review the AI-powered discharge summary before finalizing.
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
                        <Label htmlFor="clinical-summary-skeleton" className="font-semibold mb-2 block">Clinical Summary</Label>
                        <Skeleton id="clinical-summary-skeleton" className="h-64 w-full" />
                    </div>
                     <div>
                        <Label htmlFor="patient-instructions-skeleton" className="font-semibold mb-2 block">Patient Instructions</Label>
                        <Skeleton id="patient-instructions-skeleton" className="h-64 w-full" />
                    </div>
                </div>
            )}

            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="clinicalSummary" className="font-semibold text-lg">Clinical Summary (Editable)</Label>
                        <Textarea 
                            id="clinicalSummary"
                            className="h-64 font-mono text-sm"
                            value={summary.clinicalSummary}
                            onChange={(e) => setSummary({ ...summary, clinicalSummary: e.target.value })}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="patientInstructions" className="font-semibold text-lg">Patient-Friendly Instructions (Editable)</Label>
                         <Textarea 
                            id="patientInstructions"
                            className="h-64 font-mono text-sm"
                            value={summary.patientInstructions}
                            onChange={(e) => setSummary({ ...summary, patientInstructions: e.target.value })}
                         />
                    </div>
                </div>
            )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleDischarge} disabled={isSubmitting || isGenerating || !summary}>
            {isSubmitting ? 'Confirming...' : 'Confirm and Finalize Summary'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
