'use client';
import { useState } from 'react';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckSquare, Clock, UserCheck, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClinicalTaskDelegationDialogProps {
  patientId: string;
  patientName: string;
  hospitalId: string;
  onSuccess?: () => void;
}

export function ClinicalTaskDelegationDialog({ patientId, patientName, hospitalId, onSuccess }: ClinicalTaskDelegationDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [priority, setPriority] = useState<'ROUTINE' | 'URGENT' | 'STAT'>('ROUTINE');
  const [targetCategory, setTargetCategory] = useState<'VITALS_CHECK' | 'MEDICATION_ADMIN' | 'SAMPLE_COLLECTION' | 'GENERAL_CARE'>('VITALS_CHECK');
  const [instructions, setInstructions] = useState('');

  const PRESET_TASKS = [
    "Re-check Blood Pressure in 30 minutes",
    "Administer IM Syntocinon 10 IU stat",
    "Administer IV Iron Infusion 500mg",
    "Monitor SpO2 on 2L/min Nasal O2",
    "Collect Morning Fasting Blood Glucose",
    "Check Baseline Temperature & Pain Scale",
    "Elevate head of bed to 45 degrees & monitor IV site"
  ];

  const handleDelegateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !firestore || !hospitalId || !user) {
      toast({ variant: 'destructive', title: 'Task Title Required', description: 'Please specify the clinical task details.' });
      return;
    }
    setSubmitting(true);

    try {
      const tasksRef = collection(firestore, `hospitals/${hospitalId}/clinical_tasks`);
      addDocumentNonBlocking(tasksRef, {
        patientId,
        patientName,
        taskTitle,
        priority,
        targetCategory,
        instructions,
        status: 'PENDING',
        assignedByUid: user.uid,
        assignedByName: user.displayName || 'Doctor',
        createdAt: serverTimestamp(),
      });

      toast({ title: '📋 Clinical Task Delegated to Nurse Queue', description: `Task "${taskTitle}" assigned successfully.` });
      setTaskTitle('');
      setInstructions('');
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Delegation Failed', description: err.message });
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white text-slate-900 hover:text-slate-950 border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-50/80 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm">
          <CheckSquare size={14} className="text-blue-600" /> Delegate Nurse Task
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <UserCheck className="text-blue-600" /> Clinical Task Delegation
          </DialogTitle>
          <DialogDescription className="text-xs font-bold uppercase text-muted-foreground">
            Assign actionable micro-task to Nurses on Duty for {patientName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleDelegateTask} className="space-y-4 pt-2">
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Quick Task Presets</label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_TASKS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTaskTitle(preset)}
                  className="text-[9px] font-bold bg-muted hover:bg-muted/80 px-2.5 py-1 rounded-xl text-foreground text-left transition-all border"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Task Action / Title</label>
            <Input 
              required 
              value={taskTitle} 
              onChange={e => setTaskTitle(e.target.value)} 
              placeholder="e.g. Re-check BP in 30 mins" 
              className="mt-1 font-bold text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Priority</label>
              <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                <SelectTrigger className="mt-1 font-bold text-xs h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUTINE">Routine Care</SelectItem>
                  <SelectItem value="URGENT">Urgent (High)</SelectItem>
                  <SelectItem value="STAT">STAT (Immediate)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Category</label>
              <Select value={targetCategory} onValueChange={(val: any) => setTargetCategory(val)}>
                <SelectTrigger className="mt-1 font-bold text-xs h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VITALS_CHECK">Vitals & Monitoring</SelectItem>
                  <SelectItem value="MEDICATION_ADMIN">Medication Admin (eMAR)</SelectItem>
                  <SelectItem value="SAMPLE_COLLECTION">Sample Collection</SelectItem>
                  <SelectItem value="GENERAL_CARE">General Inpatient Care</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Special Nursing Instructions</label>
            <Textarea 
              rows={3} 
              value={instructions} 
              onChange={e => setInstructions(e.target.value)} 
              placeholder="Add specific target parameters (e.g., notify if SBP > 160 mmHg)..." 
              className="mt-1 font-bold text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2">
              {submitting ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
              Assign Task to Nurse
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
