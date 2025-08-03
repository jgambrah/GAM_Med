"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Patient } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { finalizeDischargeSummaryAction } from "@/lib/actions";
import { useAuth } from "../auth-provider";
import { Loader2 } from "lucide-react";
import { allAdmissions } from "@/lib/data";

interface DischargeSummaryFormProps {
  patient: Patient;
}

export function DischargeSummaryForm({ patient }: DischargeSummaryFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [condition, setCondition] = useState("");
  const [medications, setMedications] = useState("");
  const [instructions, setInstructions] = useState("");

  const admission = allAdmissions.find(a => a.admissionId === patient.currentAdmissionId);

  const handleFinalizeDischarge = async () => {
    if (!patient.currentAdmissionId || !user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Required patient or user information is missing.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const summaryData = {
        diagnosisOnDischarge: diagnosis,
        treatmentProvided: treatment,
        conditionAtDischarge: condition,
        medicationAtDischarge: medications
          .split(",")
          .map((name) => ({
            name: name.trim(),
            dosage: "As prescribed",
            instructions: "As instructed",
          })),
        followUpInstructions: instructions,
      };
      const result = await finalizeDischargeSummaryAction(
        patient.currentAdmissionId,
        summaryData,
        user.id
      );
      if (result.success) {
        toast({
          title: "Summary Finalized",
          description: result.message,
        });
        router.push("/admin/patients"); // Redirect back to the patients list
      } else {
        toast({
          variant: "destructive",
          title: "Finalization Failed",
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          Discharge Summary: {patient.fullName}
        </CardTitle>
        <CardDescription>
          Complete the clinical summary below. Once finalized, it will be sent
          for financial clearance before the patient can be officially
          discharged. Patient admitted on {admission ? new Date(admission.admissionDate).toLocaleDateString() : 'N/A'} for "{admission?.reasonForVisit}".
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2">
          <Label htmlFor="diagnosis">Diagnosis at Discharge</Label>
          <Input
            id="diagnosis"
            placeholder="e.g., Acute Myocardial Infarction"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="condition">Condition at Discharge</Label>
          <Select onValueChange={setCondition} value={condition}>
            <SelectTrigger id="condition">
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Stable">Stable</SelectItem>
              <SelectItem value="Improved">Improved</SelectItem>
              <SelectItem value="Unchanged">Unchanged</SelectItem>
              <SelectItem value="Referred">Referred</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="summary">Summary of Treatment</Label>
          <Textarea
            id="summary"
            placeholder="Patient responded well to thrombolytic therapy..."
            value={treatment}
            onChange={(e) => setTreatment(e.target.value)}
            rows={5}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="medications">
            Medications on Discharge (comma-separated)
          </Label>
          <Textarea
            id="medications"
            placeholder="Aspirin 81mg, Lisinopril 10mg"
            value={medications}
            onChange={(e) => setMedications(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="instructions">Follow-up Instructions</Label>
          <Textarea
            id="instructions"
            placeholder="Follow up with specialist in 2 weeks. Monitor blood pressure daily."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleFinalizeDischarge} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Finalize Summary & Request Financial Clearance
        </Button>
      </CardFooter>
    </Card>
  );
}
