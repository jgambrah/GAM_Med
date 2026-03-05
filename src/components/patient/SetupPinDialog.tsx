'use client';
import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ShieldCheck, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SetupPinDialog({ patientId, ehrNumber, dob, onComplete }: any) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSavePin = async () => {
    setLoading(true);
    const functions = getFunctions();
    const setPinFn = httpsCallable(functions, 'setPatientPin');

    try {
      await setPinFn({ patientId, pin, ehrNumber, dob });
      toast.success("Account Secured", { description: "You can now login using just your EHR and PIN." });
      onComplete();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[40px] shadow-2xl text-center space-y-6 border-4 border-blue-600">
      <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-blue-600">
        <Lock size={32} />
      </div>
      <div>
        <h2 className="text-2xl font-black uppercase text-black">Secure Your Portal</h2>
        <p className="text-xs font-bold text-slate-400 uppercase mt-2">Set a 4-digit PIN for faster access next time.</p>
      </div>
      <input 
        type="password" maxLength={4} placeholder="0 0 0 0"
        className="w-full text-center text-4xl font-black tracking-[0.5em] p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 outline-none focus:border-blue-600 transition-all text-black"
        onChange={(e) => setPin(e.target.value)}
      />
      <button 
        onClick={handleSavePin} disabled={loading || pin.length < 4}
        className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
        Activate PIN Access
      </button>
    </div>
  );
}
