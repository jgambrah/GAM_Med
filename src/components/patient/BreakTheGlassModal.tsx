'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, AlertTriangle, Unlock, 
  Loader2 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface BreakTheGlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    ehrNumber?: string;
  } | null;
  currentUser: any;
  userProfile: any;
  firestore: any;
}

const OVERRIDE_REASONS = [
  { id: 'EMERGENCY_RESUSCITATION', label: '🚨 Emergency Resuscitation / Critical Alert', severity: 'CRITICAL' },
  { id: 'CROSS_WARD_CONSULTATION', label: '🩺 Cross-Ward Consultation / Second Opinion', severity: 'STANDARD' },
  { id: 'MEDICATION_SAFETY_CHECK', label: '💊 Medication Safety & Dangerous Drug Verification', severity: 'STANDARD' },
  { id: 'SHIFT_HANDOVER_PREPARATION', label: '📋 Shift Handover & Inpatient Transfer Preparation', severity: 'STANDARD' },
  { id: 'SUPERVISORY_QUALITY_AUDIT', label: '🛡️ Clinical Lead / Nursing Sister Quality Review', severity: 'AUDIT' },
];

export function BreakTheGlassModal({
  isOpen,
  onClose,
  patient,
  currentUser,
  userProfile,
  firestore
}: BreakTheGlassModalProps) {
  const router = useRouter();
  const [selectedReason, setSelectedReason] = useState(OVERRIDE_REASONS[0].id);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!patient) return null;

  const handleConfirmAccess = async () => {
    if (notes.trim().length < 10) {
      setError('You must provide a clinical justification note (minimum 10 characters).');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const hospitalId = userProfile?.hospitalId || 'GAM-GAR-7578';
      const auditColRef = collection(firestore, `hospitals/${hospitalId}/break_the_glass_logs`);

      // 1. Write forensic audit log to hospital ledger
      await addDocumentNonBlocking(auditColRef, {
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientEhr: patient.ehrNumber || patient.id,
        actorId: currentUser.uid,
        actorName: userProfile?.fullName || 'Clinical Staff',
        actorRole: userProfile?.role || 'NURSE',
        staffNumber: userProfile?.staffNumber || 'GAM-STF',
        reason: selectedReason,
        justificationNotes: notes.trim(),
        timestamp: serverTimestamp(),
        clientTimestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Unknown',
        accessGranted: true,
      });

      // 2. Also log to Global Compliance Ledger
      const globalAuditRef = collection(firestore, 'global_audit_logs');
      await addDocumentNonBlocking(globalAuditRef, {
        type: 'PRIVACY_OVERRIDE',
        action: 'BREAK_THE_GLASS_ACCESSED',
        hospitalId: hospitalId,
        actorId: currentUser.uid,
        actorName: userProfile?.fullName || 'Clinical Staff',
        details: `Clinician ${userProfile?.fullName || currentUser.uid} executed Break-The-Glass override for patient ${patient.firstName} ${patient.lastName} (${patient.ehrNumber || patient.id}). Reason: ${selectedReason}. Notes: ${notes.trim()}`,
        timestamp: serverTimestamp()
      });

      // 3. Navigate to patient folder with verified BTG token
      router.push(`/patients/folder/${patient.id}?btg=true`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to authorize break-the-glass access.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-slate-950 border border-slate-800 text-slate-100 p-6 shadow-2xl rounded-2xl">
        <DialogHeader className="border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                Break The Glass <span className="text-rose-400 text-xs px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 font-mono">SECURITY PROTOCOL</span>
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Restricted Clinical Record: <span className="font-bold text-slate-200">{patient.firstName} {patient.lastName}</span> ({patient.ehrNumber || patient.id})
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Privacy Shield Notice */}
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3.5 my-4 flex items-start gap-3 text-amber-200 text-xs">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-amber-300">Privacy Notice:</strong> You do not currently have an active admitted encounter with this patient. Accessing confidential medical records without clinical justification violates hospital policy and HIPAA data protection laws. <span className="text-white font-semibold">This access event will be permanently audited by Internal Audit.</span>
          </p>
        </div>

        {/* Reason Selector */}
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 font-mono">
              Select Clinical Justification Reason *
            </label>
            <div className="space-y-2">
              {OVERRIDE_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    selectedReason === r.id
                      ? 'bg-rose-950/30 border-rose-500/60 text-white shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="override_reason"
                      value={r.id}
                      checked={selectedReason === r.id}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="accent-rose-500 h-4 w-4 cursor-pointer"
                    />
                    <span>{r.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Clinical Context Notes */}
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 font-mono">
              Clinical Context / Specific Justification Note *
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Attending to emergency cardiac alert in Resus Bay 2; accessing previous baseline ECG and allergy history..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
            {error && <p className="text-[11px] font-bold text-rose-400 mt-1">{error}</p>}
          </div>
        </div>

        <DialogFooter className="border-t border-slate-800/80 pt-4 mt-4 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="text-slate-400 hover:text-white">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAccess}
            disabled={isSubmitting}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wide gap-2 shadow-lg shadow-rose-600/20"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
            Break The Glass & Open Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
