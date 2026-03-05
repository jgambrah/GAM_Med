'use client';
import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, onSnapshot, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Calendar, Clock, XCircle, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface Appointment {
    id: string;
    patientName: string;
    doctorName: string;
    date: string;
    timeSlot: string;
    status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'CANCELLED_BY_PATIENT';
}

export default function MyUpcomingAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    const pId = localStorage.getItem('mygammed_patient_id');
    if (!pId) {
      router.push('/patient/login');
    } else {
      setPatientId(pId);
    }
  }, [router]);

  const appointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !patientId) return null;
    return query(
      collection(firestore, "appointments"),
      where("patientId", "==", patientId),
      where("status", "in", ["PENDING", "CONFIRMED"]),
      orderBy('date', 'asc')
    );
  }, [firestore, patientId]);

  const { data: fetchedAppointments, isLoading: areAppointmentsLoading } = useCollection<Appointment>(appointmentsQuery);

  useEffect(() => {
    if(fetchedAppointments) {
      setAppointments(fetchedAppointments);
      setLoading(areAppointmentsLoading);
    }
  }, [fetchedAppointments, areAppointmentsLoading]);

  const handleCancel = async (apptId: string) => {
    const confirmCancel = confirm("Are you sure you want to cancel this appointment? This action cannot be undone.");
    if (!confirmCancel) return;

    try {
      if(!firestore) throw new Error("Firestore not available");
      const apptDocRef = doc(firestore, "appointments", apptId);
      updateDocumentNonBlocking(apptDocRef, {
        status: 'CANCELLED_BY_PATIENT',
        cancelledAt: serverTimestamp()
      });
      toast({ title: "Appointment Cancelled" });
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Error", description: e.message });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      <h1 className="text-3xl font-black uppercase tracking-tighter italic text-black">My <span className="text-blue-600">Appointments</span></h1>

      <div className="space-y-4">
        {loading ? (
            <div className="p-12 text-center">
                <Loader2 className="animate-spin text-primary" />
            </div>
        ) : appointments.length === 0 ? (
          <div className="p-12 bg-white rounded-[40px] text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold uppercase text-xs italic">No upcoming visits scheduled.</p>
          </div>
        ) : (
          appointments.map(appt => (
            <div key={appt.id} className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${appt.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="font-black text-black uppercase text-sm">{appt.doctorName}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{appt.date} @ {appt.timeSlot}</p>
                  </div>
                </div>
                <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase italic ${appt.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {appt.status}
                </span>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleCancel(appt.id)}
                  className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <XCircle size={14} /> Cancel Visit
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-6 bg-[#0f172a] rounded-[32px] text-white flex items-start gap-4">
        <AlertCircle className="text-blue-400 shrink-0" size={20} />
        <p className="text-[10px] font-medium text-slate-400 leading-relaxed uppercase">
          Please cancel at least 2 hours before your slot to allow other patients to access care.
        </p>
      </div>
    </div>
  );
}
