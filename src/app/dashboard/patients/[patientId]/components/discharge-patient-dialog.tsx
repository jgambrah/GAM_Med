
'use client';

import * as React from 'react';
import { LogOut, Bot, PencilLine } from 'lucide-react';
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
import { Patient, ClinicalNote, User } from '@/lib/types';
import { dischargePatient } from '@/lib/actions';
import { generateDischargeSummary, GenerateDischargeSummaryOutput } from '@/ai/flows/discharge-summary-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { allUsers } from '@/lib/data';

interface DischargePatientDialogProps {
  patient: Patient;
  clinicalNotes: ClinicalNote[];
  disabled?: boolean;
  onDischargeComplete: () => void;
}

/**
 * == Conceptual UI: Doctor's Discharge Summary Form ==
 *
 * This component serves as the primary interface for clinical staff (doctors) to initiate
 * and finalize the medical portion of a patient's discharge. It's an interactive form where
 * AI provides a draft that the doctor can then edit and approve.
 */
export function DischargePatientDialog({ patient, clinicalNotes, disabled, onDischargeComplete }: DischargePatientDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [summary, setSummary] = React.useState<GenerateDischargeSummaryOutput | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  
  const getUserName = (userId: string) => {
    return allUsers.find(u => u.uid === userId)?.name || 'Unknown User';
  }

  /**
   * == Workflow Step 1: AI Generation ==
   * This function is triggered when the doctor clicks "Generate Summary".
   * It calls the `generateDischargeSummary` Genkit flow and stores the result
   * in the component's state, populating the form fields.
   */
  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    setError(null);
    setSummary(null);
    try {
        const formattedNotes = clinicalNotes.map(note => ({
            author: getUserName(note.recordedByUserId),
            date: note.recordedAt,
            content: note.noteText,
        }));

        const result = await generateDischargeSummary({ clinicalNotes: formattedNotes });
        // The AI-generated data is stored in the component's state.
        setSummary(result);
    } catch (e) {
        setError('Failed to generate discharge summary. Please try again.');
        console.error(e);
    } finally {
        setIsGenerating(false);
    }
  }
  
  const handleManualEntry = () => {
    setSummary({ clinicalSummary: '', patientInstructions: '' });
  }

  /**
   * == Workflow Step 2: Review, Edit, and Sign-off ==
   * This function is called when the doctor clicks "Confirm and Discharge Patient".
   * It acts as the clinical sign-off, sending the final, potentially edited summary
   * from the component's state to the backend via a server action.
   * This would trigger the `finalizeDischargeSummary` Cloud Function.
   */
  const handleDischarge = async () => {
    if (!patient.current_admission_id || !summary) {
        alert("Error: Missing admission ID or summary.");
        return;
    }
    setIsSubmitting(true);
    // The component sends the data from its state, which includes any edits
    // made by the doctor in the Textarea components.
    const result = await dischargePatient(
        patient.patient_id, 
        patient.current_admission_id,
        summary.clinicalSummary,
        summary.patientInstructions
    );

    if (result.success) {
        alert('Patient has been discharged successfully (simulated).');
        onDischargeComplete(); // Notify parent component to update state
        handleOpenChange(false);
    } else {
        alert(`Error: ${result.message}`);
    }
    setIsSubmitting(false);
  };
  
  // Resets the component's state when the dialog is closed.
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
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
            Generate an AI-powered discharge summary or write one manually before finalizing.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto space-y-4 pr-6">
            {!summary && !isGenerating && (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 border-2 border-dashed rounded-lg">
                    <div className="flex items-center gap-4">
                        <Bot className="h-12 w-12 text-muted-foreground" />
                        <PencilLine className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mt-4">Create Discharge Summary</h3>
                    <p className="text-muted-foreground mt-1 max-w-md">
                        Use AI to generate a summary from clinical notes, or write one from scratch.
                    </p>
                    <div className="flex gap-4 mt-4">
                         <Button onClick={handleManualEntry} variant="secondary">
                            <PencilLine className="h-4 w-4 mr-2" />
                            Write Manually
                        </Button>
                        <Button onClick={handleGenerateSummary} disabled={isGenerating}>
                            <Bot className="h-4 w-4 mr-2" />
                            {isGenerating ? 'Generating...' : 'Generate with AI'}
                        </Button>
                    </div>
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
                        {/* The Textarea's `onChange` handler updates the 'summary' state, allowing for edits. */}
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
