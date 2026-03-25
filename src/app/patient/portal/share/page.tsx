'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, serverTimestamp } from 'firebase/firestore';
import { Share2, Hospital, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Re-using the patient data structure from other portal pages
interface PatientData {
  id: string;
  hospitalId: string;
  firstName: string;
  lastName: string;
  ehrNumber: string;
  ghanaCardId?: string; // This is the crucial part
}

export default function ShareHistoryPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedProfile = localStorage.getItem('mygammed_patient_profile');
    if (!storedProfile) {
      router.push('/patient/login');
    } else {
      setPatient(JSON.parse(storedProfile));
    }
  }, [router]);

  // Fetch all hospitals in the network
  const hospitalsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'hospitals'));
  }, [firestore]);
  const { data: hospitals, isLoading: areHospitalsLoading } = useCollection(hospitalsQuery);

  const handleAuthorizeHospital = async (targetHospital: any) => {
    if (!patient || !patient.ghanaCardId) {
      toast({
        variant: "destructive",
        title: "Missing ID",
        description: "Your Ghana Card ID is not on file, so your record cannot be shared.",
      });
      return;
    }
    if (!firestore) return;

    setLoading(true);
    const consentId = `${targetHospital.id}_${patient.ghanaCardId}`;
    const consentRef = doc(firestore, "patient_consents", consentId);

    try {
      // Using setDocumentNonBlocking as per patterns
      setDocumentNonBlocking(consentRef, {
        hospitalId: targetHospital.id,
        hospitalName: targetHospital.name,
        ghanaCardId: patient.ghanaCardId,
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        status: 'ACTIVE',
        grantedAt: serverTimestamp()
      }, { merge: true }); // Use merge to be safe

      toast({
        title: "History Shared Successfully",
        description: `Your clinical history is now visible to ${targetHospital.name}.`
      });
    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Sharing Failed",
            description: e.message
        })
    } finally {
        setLoading(false);
    }
  };

  if (!patient) {
      return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-black uppercase tracking-tighter italic text-black">Share My <span className="text-blue-600">History</span></h1>
        <p className="text-xs text-slate-500 font-bold uppercase">Grant another hospital access to your unified medical record.</p>
      </div>

      <div className="bg-blue-50 border-2 border-blue-100 p-6 rounded-[32px] text-blue-900 space-y-3">
          <div className="flex items-center gap-3">
             <ShieldCheck size={24} />
             <h3 className="font-black uppercase tracking-widest text-xs">Data Protection Act (843) Consent</h3>
          </div>
          <p className="text-xs font-medium leading-relaxed">
             By clicking "Authorize," you are giving your explicit consent for the selected hospital to view your clinical history from other facilities within the GAM-Med network. This access is read-only and is for the sole purpose of continuity of care. You can revoke this access at any time.
          </p>
      </div>

      <div className="space-y-4">
        {areHospitalsLoading ? (
            <div className="p-10 text-center"><Loader2 className="animate-spin" /></div>
        ) : (
            hospitals?.filter(h => h.id !== patient.hospitalId).map(h => (
                <div key={h.id} className="bg-white p-4 rounded-[28px] border-2 border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-100 p-3 rounded-2xl"><Hospital size={20} /></div>
                        <div>
                            <p className="font-black uppercase text-black text-sm">{h.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{h.region}</p>
                        </div>
                    </div>
                    <Button onClick={() => handleAuthorizeHospital(h)} disabled={loading}>
                        <Share2 size={16} /> Authorize Access
                    </Button>
                </div>
            ))
        )}
      </div>
    </div>
  );
}
