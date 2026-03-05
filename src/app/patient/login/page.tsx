'use client';
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collectionGroup, query, where, getDocs, limit } from 'firebase/firestore';
import { Activity, Fingerprint, Lock, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function PatientPortalLogin() {
  const [form, setForm] = useState({ ehrNumber: '', dob: '', lastName: '', pin: '' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [loginMode, setLoginMode] = useState<'IDENTIFY' | 'PIN'>('IDENTIFY');
  const [hasPin, setHasPin] = useState(false);

  const checkEhr = async (ehr: string) => {
    setForm({...form, ehrNumber: ehr}); // update form state

    if (!firestore) return;

    // As the patient types their EHR, check if a PIN is already set
    if (ehr.length > 5) {
        try {
            const q = query(collectionGroup(firestore, "patients"), where("ehrNumber", "==", ehr.toUpperCase()), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const data = snap.docs[0].data();
                if (data.portalPin) {
                    setHasPin(true);
                    setLoginMode('PIN');
                    toast({title: "Account Found", description: "This EHR number is PIN-protected. Please enter your secret PIN."});
                } else {
                    setHasPin(false);
                    setLoginMode('IDENTIFY');
                }
            } else {
                // If no user found, reset to identify mode
                setHasPin(false);
                setLoginMode('IDENTIFY');
            }
        } catch(e) {
            console.error("Error checking EHR: ", e);
            setHasPin(false);
            setLoginMode('IDENTIFY');
        }
    }
  };


  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!firestore) {
      toast({
        variant: "destructive",
        title: "System Error",
        description: "Database connection is not ready. Please try again.",
      });
      setLoading(false);
      return;
    }

    try {
      // Search for the patient record based on EHR number first
      const q = query(
        collectionGroup(firestore, "patients"),
        where("ehrNumber", "==", form.ehrNumber.toUpperCase()),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("No patient record found for this EHR Number.");
      }

      const patientDoc = querySnapshot.docs[0];
      const patientData = { id: patientDoc.id, ...patientDoc.data() };
      
      // Now, perform verification based on the login mode
      if (loginMode === 'PIN') {
        // In a real app, this PIN would be hashed and compared. For now, it's plain text.
        if (patientData.portalPin !== form.pin) {
            throw new Error("Incorrect PIN. Please try again or contact support.");
        }
      } else { // IDENTIFY mode
        if (patientData.lastName.toLowerCase() !== form.lastName.toLowerCase() || patientData.dateOfBirth !== form.dob) {
          throw new Error("Information mismatch. Verify your Last Name and Date of Birth.");
        }
      }

      // If all checks pass, proceed with the handshake
      localStorage.setItem('mygammed_patient_profile', JSON.stringify(patientData));

      toast({ title: "Identity Verified!", description: `Welcome back, ${patientData.firstName}` });
      
      router.push('/patient/portal');

    } catch (err: any) {
      toast({ variant: "destructive", title: "Access Denied", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="bg-blue-600 w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto shadow-xl shadow-blue-100 mb-4">
             <Activity className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black text-black uppercase tracking-tighter italic">My<span className="text-blue-600">GamMed</span></h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Personal Health Record Portal</p>
        </div>

        <form onSubmit={handlePatientLogin} className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 space-y-5 shadow-sm">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Hospital EHR Number</label>
            <input 
              type="text" required placeholder="e.g. GMC-001"
              className="w-full p-4 border-2 border-white rounded-2xl mt-1 text-black font-black bg-white outline-none focus:border-blue-500 transition-all uppercase"
              value={form.ehrNumber}
              onChange={e => checkEhr(e.target.value)}
            />
          </div>

          {loginMode === 'PIN' ? (
            <div>
              <label className="text-[10px] font-black text-blue-600 uppercase ml-2">Enter Secret PIN</label>
              <input 
                type="password" maxLength={6} required 
                className="w-full p-4 border-2 border-blue-200 rounded-2xl mt-1 text-black font-black text-center text-2xl tracking-[1em] bg-blue-50/50"
                onChange={e => setForm({...form, pin: e.target.value})}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Your Surname</label>
                  <input 
                    type="text" required placeholder="Last Name"
                    className="w-full p-4 border-2 border-white rounded-2xl mt-1 text-black font-black bg-white outline-none focus:border-blue-500"
                    onChange={e => setForm({...form, lastName: e.target.value})}
                  />
              </div>
              <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Date of Birth</label>
                  <input 
                    type="date" required 
                    className="w-full p-4 border-2 border-white rounded-2xl mt-1 text-black font-black bg-white outline-none focus:border-blue-500"
                    onChange={e => setForm({...form, dob: e.target.value})}
                  />
              </div>
            </div>
          )}


          <button 
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all hover:bg-black"
          >
            {loading ? <Loader2 className="animate-spin" /> : (loginMode === 'PIN' ? <Lock size={20}/> : <Fingerprint size={20} />) }
            Access My Records
          </button>
        </form>

        <p className="text-center text-[9px] text-slate-400 uppercase font-bold leading-relaxed px-10">
          Secure encryption active. Your clinical data is protected under the Ghana Data Protection Act (Act 843).
        </p>
      </div>
    </div>
  );
}
