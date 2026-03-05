'use client';
import { useState, useEffect } from 'react';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { Calendar, User, Clock, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface PatientData {
  id: string;
  hospitalId: string;
  //... other fields
}

export default function PatientBooking() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();

  useEffect(() => {
    const storedProfile = localStorage.getItem('mygammed_patient_profile');
    if (!storedProfile) {
      router.push('/patient/login');
    } else {
      setPatient(JSON.parse(storedProfile));
    }
  }, [router]);

  useEffect(() => {
    if (!firestore || !patient?.hospitalId) return;

    // Fetch available doctors in the patient's registered hospital
    const q = query(collection(firestore, "doctor_availability"), where("hospitalId", "==", patient.hospitalId));
    getDocs(q).then(snap => {
        setDoctors(snap.docs.map(d => ({id: d.id, ...d.data()})))
    });
  }, [firestore, patient]);

  const handleBook = async (time: string) => {
    if (!patient) {
        toast({ variant: "destructive", title: "Patient data not found. Please log in again." });
        return;
    }
    if (!selectedDoctor) {
        toast({ variant: "destructive", title: "Please select a doctor." });
        return;
    }
     if (!selectedDate) {
        toast({ variant: "destructive", title: "Please select a date." });
        return;
    }

    setLoading(true);

    try {
      addDocumentNonBlocking(collection(firestore, "appointments"), {
        patientId: patient.id,
        doctorId: selectedDoctor.doctorId,
        doctorName: selectedDoctor.doctorName,
        hospitalId: patient.hospitalId,
        date: selectedDate,
        timeSlot: time,
        status: 'PENDING', // PENDING -> CONFIRMED -> COMPLETED
        createdAt: serverTimestamp()
      });

      toast({ title: "Appointment Requested", description: "Wait for hospital confirmation via SMS." });
      
      setTimeout(() => {
        router.push('/patient/portal');
      }, 2000);

    } catch (e: any) { 
        toast({ variant: "destructive", title: e.message });
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-8 text-black">
      <h1 className="text-3xl font-black uppercase tracking-tighter italic">Book <span className="text-blue-600">Appointment</span></h1>

      {/* STEP 1: SELECT DOCTOR */}
      <div className="space-y-4">
         <p className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 px-2"><User size={14}/> Choose Your Clinician</p>
         <div className="grid grid-cols-1 gap-4">
            {doctors.map(doc => (
              <div 
                key={doc.id} 
                onClick={() => setSelectedDoctor(doc)}
                className={`p-6 rounded-[32px] border-2 transition-all cursor-pointer flex justify-between items-center ${selectedDoctor?.id === doc.id ? 'border-blue-600 bg-white shadow-xl' : 'border-transparent bg-white shadow-sm'}`}
              >
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">Dr</div>
                    <div>
                       <p className="font-black uppercase text-sm">{doc.doctorName}</p>
                       <p className="text-[9px] text-slate-400 font-bold uppercase">{doc.days.join(', ')}</p>
                    </div>
                 </div>
                 {selectedDoctor?.id === doc.id && <CheckCircle2 className="text-blue-600" size={24}/>}
              </div>
            ))}
         </div>
      </div>

      {/* STEP 2: SELECT DATE & TIME */}
      {selectedDoctor && (
        <div className="space-y-4 animate-in fade-in duration-300">
           <p className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 px-2"><Calendar size={14}/> Pick Date & Time</p>
           <input type="date" className="w-full p-5 rounded-[28px] border-none shadow-sm bg-white font-black text-black" onChange={e => setSelectedDate(e.target.value)} />
           
           <div className="grid grid-cols-3 gap-3">
              {['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM'].map(time => (
                <button 
                  key={time}
                  onClick={() => handleBook(time)}
                  disabled={loading}
                  className="p-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-blue-600 transition-all shadow-lg disabled:bg-slate-400"
                >
                  {loading ? <Loader2 className="animate-spin" /> : time}
                </button>
              ))}
           </div>
        </div>
      )}
    </div>
  );
}
