'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, getDocs, orderBy } from 'firebase/firestore';
import { 
  UserCheck, Users, Stethoscope, ArrowRight, 
  Clock, MapPin, Loader2, CheckCircle2, ShieldAlert 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function PatientAssignmentDesk() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  
  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'NURSE', 'RECEPTIONIST'].includes(userProfile?.role || '');

  // 1. Listen for patients who have vitals but NO assigned doctor yet
  const unassignedPatientsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, 'hospitals', hospitalId, 'patients'),
      where("status", "==", "Waiting for Assignment"),
      orderBy("createdAt", "asc")
    );
  }, [firestore, hospitalId]);
  const { data: unassignedPatients, isLoading: arePatientsLoading } = useCollection(unassignedPatientsQuery);

  // 2. Fetch all Doctors in this hospital
  const onlineDoctorsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, "users"),
      where("hospitalId", "==", hospitalId),
      where("role", "==", "DOCTOR"),
      where("is_active", "==", true)
    );
  }, [firestore, hospitalId]);
  const { data: onlineDoctors, isLoading: areDoctorsLoading } = useCollection(onlineDoctorsQuery);

  const handleAssign = async (patientId: string, doctor: any) => {
    setLoading(true);
    if (!firestore || !user) {
        toast({variant: 'destructive', title: "System not ready."});
        setLoading(false);
        return;
    }
    try {
      const patientRef = doc(firestore, `hospitals/${hospitalId}/patients`, patientId);
      
      // THE CLINICAL HANDSHAKE
      updateDocumentNonBlocking(patientRef, {
        assignedDoctorId: doctor.id,
        assignedDoctorName: doctor.fullName,
        status: 'Waiting for Doctor', // This makes them pop up on the Doctor's Dashboard
        assignedAt: serverTimestamp(),
        assignmentHandledBy: user.uid
      });

      toast({ title: "Patient Assigned", description: `Patient assigned to Dr. ${doctor.fullName.split(' ')[1]}`});
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Assignment Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading;
  
  if (pageIsLoading) {
      return (
          <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
      );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized for this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
      <div className="flex justify-between items-end border-b-4 border-slate-900 pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Patient <span className="text-blue-600">Dispatcher</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Directing clinical traffic to available consulting rooms.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* LEFT: UNASSIGNED QUEUE */}
        <div className="space-y-6">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Clock size={16} className="text-orange-500" /> Ready for Consultation ({arePatientsLoading ? '...' : unassignedPatients?.length ?? 0})
           </h3>
           
           <div className="space-y-4">
              {arePatientsLoading && <Loader2 className="animate-spin mx-auto my-10" />}
              {!arePatientsLoading && unassignedPatients?.length === 0 ? (
                <div className="p-20 bg-slate-50 rounded-[40px] border-2 border-dashed text-center text-slate-300 italic uppercase text-xs">All patients assigned.</div>
              ) : unassignedPatients?.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm flex justify-between items-center group">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-black">
                         {p.firstName[0]}
                      </div>
                      <div>
                         <p className="font-black text-black uppercase text-sm">{p.firstName} {p.lastName}</p>
                         <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">EHR: {p.ehrNumber}</p>
                      </div>
                   </div>
                   
                   <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {p.vitals?.bp && <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase">BP: {p.vitals.bp}</span>}
                      {p.vitals?.temp && <span className="text-[8px] font-black bg-red-50 text-red-600 px-3 py-1 rounded-full uppercase">T: {p.vitals.temp}°C</span>}
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* RIGHT: DOCTOR DIRECTORY & ASSIGNMENT */}
        <div className="space-y-6">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Stethoscope size={16} className="text-blue-600" /> Available Clinicians
           </h3>

           <div className="grid grid-cols-1 gap-4">
              {areDoctorsLoading && <Loader2 className="animate-spin mx-auto my-10" />}
              {onlineDoctors?.map(doc => (
                <div key={doc.id} className="bg-[#0f172a] p-6 rounded-[32px] text-white shadow-xl flex justify-between items-center group hover:bg-blue-600 transition-all">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                         <UserCheck size={24} className="text-blue-400 group-hover:text-white" />
                      </div>
                      <div>
                         <p className="font-black uppercase text-sm">{doc.fullName}</p>
                         <p className="text-[10px] font-bold text-slate-400 group-hover:text-blue-100 uppercase tracking-widest">Specialty: {doc.specialty || 'General'}</p>
                      </div>
                   </div>

                   <button 
                     disabled={!unassignedPatients || unassignedPatients.length === 0 || loading}
                     onClick={() => handleAssign(unassignedPatients![0].id, doc)}
                     className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest group-hover:bg-white group-hover:text-black transition-all shadow-lg flex items-center gap-2"
                   >
                      Assign Next <ArrowRight size={14} />
                   </button>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
