'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { FileText, Languages, Printer, CheckCircle2, ShieldAlert } from 'lucide-react';
import { generateDischargeCarePlan } from '@/ai/flows/ai-discharge-generator';

interface DischargeCarePlanDialogProps {
  patientName: string;
  diagnosis?: string;
}

export function DischargeCarePlanDialog({ patientName, diagnosis = 'General Post-Consultation Care' }: DischargeCarePlanDialogProps) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<'ENGLISH' | 'TWI'>('ENGLISH');

  const carePlan = generateDischargeCarePlan(patientName, diagnosis, language);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 border-slate-300">
          <FileText size={14} className="text-emerald-600" /> Auto Discharge & Care Plan
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl bg-card text-card-foreground">
        <DialogHeader>
          <div className="flex justify-between items-center pr-6">
            <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
              <FileText className="text-emerald-600" /> Patient Care & Discharge Plan
            </DialogTitle>

            {/* LANGUAGE TOGGLE */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-2xl border">
              <button
                type="button"
                onClick={() => setLanguage('ENGLISH')}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all ${
                  language === 'ENGLISH' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                English 🇬🇧
              </button>
              <button
                type="button"
                onClick={() => setLanguage('TWI')}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all ${
                  language === 'TWI' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Twi 🇬🇭
              </button>
            </div>
          </div>

          <DialogDescription className="text-xs font-bold uppercase text-muted-foreground">
            {carePlan.summaryTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[65vh] overflow-y-auto pr-2 text-xs font-bold">
          {/* WARNING FLAGS */}
          <div className="bg-red-950 text-red-200 p-4 rounded-2xl border border-red-800 space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1 text-red-400">
              <ShieldAlert size={14} /> Emergency Red Flags:
            </h4>
            {carePlan.warningFlags.map((w, i) => (
              <p key={i} className="text-xs font-black uppercase">{w}</p>
            ))}
          </div>

          {/* CARE INSTRUCTIONS */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-600" /> Care Instructions
            </h4>
            <ul className="bg-muted/50 p-4 rounded-2xl space-y-2 list-disc list-inside">
              {carePlan.careInstructions.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>

          {/* DIET GUIDE */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Dietary & Nutrition Guide</h4>
            <p className="bg-muted/50 p-4 rounded-2xl">{carePlan.dietGuide}</p>
          </div>

          {/* MEDICATION PLAN */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Medication Administration Schedule</h4>
            <ul className="bg-muted/50 p-4 rounded-2xl space-y-1.5 list-disc list-inside">
              {carePlan.medicationPlan.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Close</Button>
          <Button 
            onClick={() => window.print()} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2"
          >
            <Printer size={14} /> Print Patient Care Plan ({language})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
