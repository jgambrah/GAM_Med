
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { OTSession } from '@/lib/types';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

// In a real app, this would be fetched from the `surgical_cases` document.
const mockChecklistItems = [
  { id: 'consent', label: 'Consent Form Signed & Witnessed' },
  { id: 'npo', label: 'NPO (Nil Per Os) Status Confirmed' },
  { id: 'preop-labs', label: 'Pre-op Labs (FBC, UEC, Clotting) Reviewed' },
  { id: 'anesthesia-review', label: 'Anesthesia Pre-op Review Completed' },
  { id: 'site-marking', label: 'Surgical Site Marked by Surgeon' },
  { id: 'allergies-confirmed', label: 'Allergies Confirmed with Patient' },
  { id: 'id-band', label: 'Patient ID Band Checked' },
];

interface PreOpChecklistTabProps {
  surgery?: OTSession;
}

export function PreOpChecklistTab({ surgery }: PreOpChecklistTabProps) {
  const { user } = useAuth();
  const [checklist, setChecklist] = React.useState<Record<string, boolean>>({
    'consent': true, // Mocking some as already completed
    'npo': true,
  });

  const canEdit = user?.role === 'doctor' || user?.role === 'nurse';

  const handleCheckChange = (itemId: string, isChecked: boolean) => {
    if (!canEdit) return;

    // In a real app, this would call a server action `updatePreOpChecklistItem(caseId, itemId, isChecked)`
    setChecklist(prev => ({ ...prev, [itemId]: isChecked }));
    toast.info(`Checklist item updated by ${user?.name}.`);
  };
  
  if (!surgery) {
    return (
        <Card>
            <CardContent className="h-48 flex items-center justify-center">
                <p className="text-muted-foreground">This patient has no upcoming or recent surgery scheduled.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pre-Operative Checklist</CardTitle>
        <CardDescription>
          For upcoming procedure: <strong>{surgery.procedureName}</strong> scheduled on {' '}
          <strong>{format(new Date(surgery.startTime), 'PPP p')}</strong> with {' '}
          <strong>{surgery.surgeonName}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockChecklistItems.map((item) => (
          <div key={item.id} className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
            <Checkbox
              id={item.id}
              checked={checklist[item.id] || false}
              onCheckedChange={(checked) => handleCheckChange(item.id, checked as boolean)}
              disabled={!canEdit}
            />
            <label
              htmlFor={item.id}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {item.label}
            </label>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
