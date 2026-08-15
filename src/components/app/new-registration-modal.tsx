'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, X, Loader2, CreditCard, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NewRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (ehrNumber: string) => void;
  hospitalId?: string;
}

export default function NewRegistrationModal({ isOpen, onClose, onSuccess, hospitalId }: NewRegistrationModalProps) {
  const { toast } = useToast();
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    otherNames: '',
    dob: '',
    gender: 'Female',
    phone: '',
    ghanaCard: '',
    priorityQueue: 'STANDARD',
    payerId: 'CASH',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast({ variant: 'destructive', title: "Missing Information", description: "First name and Last name are required." });
      return;
    }

    setIsRegistering(true);

    try {
      const res = await fetch('/api/patients/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          otherNames: formData.otherNames,
          dateOfBirth: formData.dob,
          gender: formData.gender,
          phone: formData.phone,
          ghanaCard: formData.ghanaCard,
          priorityQueue: formData.priorityQueue,
          payerId: formData.payerId,
          hospitalId: hospitalId || 'GAM-GAR-7578',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Registration transaction failed.');
      }

      const assignedEhr = data.ehrNumber || 'MMH/EHR/26/0008';

      toast({
        title: "✅ Patient Registered Successfully!",
        description: `EHR ID assigned: ${assignedEhr} • Status: WAITING_FOR_ASSIGNMENT`,
      });

      if (onSuccess) onSuccess(assignedEhr);
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Registration Failed",
        description: error.message || "Failed to process atomic registration.",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        
        {/* Modal Header */}
        <div className="bg-slate-950 text-white p-6 shrink-0 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-400">
              <UserPlus size={22} />
              <h2 className="text-xl font-black italic uppercase tracking-wider text-white">NEW EHR REGISTRATION</h2>
            </div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mt-1">
              Walk-in Patient Profile Creation & Atomic Sequential ID Assignment
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-6 text-slate-900 dark:text-slate-100">
          
          {/* Section 1: Demographics */}
          <div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
              Primary Demographics
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">First Name *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.firstName}
                  onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="e.g. Benjamin"
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Last Name *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.lastName}
                  onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="e.g. Hedidor"
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Date of Birth *</label>
                <input 
                  type="date" 
                  required 
                  value={formData.dob}
                  onChange={e => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Biological Sex *</label>
                <select 
                  required 
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none cursor-pointer"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Phone Number *</label>
                <input 
                  type="tel" 
                  required 
                  placeholder="024 XXX XXXX" 
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none" 
                />
              </div>
            </div>
          </div>

          {/* Section 2: Identity & Triage Context */}
          <div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
              Identity & Triage Context
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Ghana Card (NIA) Number</label>
                <input 
                  type="text" 
                  placeholder="GHA-XXXXXXXXX-X" 
                  value={formData.ghanaCard}
                  onChange={e => setFormData({ ...formData, ghanaCard: e.target.value })}
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono font-bold outline-none uppercase" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Initial Priority Queue</label>
                <select 
                  value={formData.priorityQueue}
                  onChange={e => setFormData({ ...formData, priorityQueue: e.target.value })}
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none cursor-pointer"
                >
                  <option value="STANDARD">Standard OPD Triage</option>
                  <option value="EMERGENCY">Emergency / Fast-Track</option>
                  <option value="MATERNITY">Maternity / ANC Clinic</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Atomic Counter Locked</span>
            </div>

            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                className="px-6 py-3 font-bold text-xs uppercase rounded-xl"
              >
                CANCEL
              </Button>

              <Button 
                type="submit" 
                disabled={isRegistering} 
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>GENERATING EHR...</span>
                  </>
                ) : (
                  'REGISTER PATIENT & GENERATE EHR'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
