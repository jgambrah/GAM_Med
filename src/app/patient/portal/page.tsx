'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, orderBy } from 'firebase/firestore';
import { 
  HeartPulse, Beaker, Camera, Pill, 
  CreditCard, Bell, 
  Download, Loader2, ServerCrash, LogOut, Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type Record = {
    id: string;
    type: 'LAB' | 'SCAN';
    name: string;
    date: Date;
    data: any;
}

type Prescription = {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
}

type PatientData = {
  id: string;
  hospitalId: string;
  firstName: string;
  lastName: string;
  ehrNumber: string;
  bloodGroup?: string;
  nhisNumber?: string;
}

export default function PatientPortalPage() {
  const firestore = useFirestore();
  const router = useRouter();

  const [patient, setPatient] = useState<PatientData | null>(null);

  useEffect(() => {
    const storedProfile = localStorage.getItem('mygammed_patient_profile');
    if (!storedProfile) {
      router.push('/patient/login');
    } else {
      setPatient(JSON.parse(storedProfile));
    }
  }, [router]);
  
  const labQuery = useMemoFirebase(() => 
    firestore && patient?.id ? query(collectionGroup(firestore, "lab_orders"), where("patientId", "==", patient.id), where("status", "==", "COMPLETED"), orderBy("completedAt", "desc")) : null,
  [firestore, patient]);
  const { data: labRecords, isLoading: areLabsLoading, error: labError } = useCollection(labQuery);
  
  const scanQuery = useMemoFirebase(() => 
    firestore && patient?.id ? query(collectionGroup(firestore, "radiology_orders"), where("patientId", "==", patient.id), where("status", "==", "COMPLETED"), orderBy("completedAt", "desc")) : null,
  [firestore, patient]);
  const { data: scanRecords, isLoading: areScansLoading, error: scanError } = useCollection(scanQuery);
  
  const encountersQuery = useMemoFirebase(() => 
    firestore && patient?.id ? query(collectionGroup(firestore, 'encounters'), where('patientId', '==', patient.id), orderBy('createdAt', 'desc')) : null,
  [firestore, patient]);
  const { data: encounters, isLoading: areEncountersLoading, error: encounterError } = useCollection(encountersQuery);

  const paymentsQuery = useMemoFirebase(() => 
    firestore && patient?.id ? query(collectionGroup(firestore, 'payments'), where('patientId', '==', patient.id), orderBy('createdAt', 'desc')) : null,
  [firestore, patient]);
  const { data: payments, isLoading: arePaymentsLoading, error: paymentError } = useCollection(paymentsQuery);

  const diagnosticRecords: Record[] = useMemo(() => {
    const labs = (labRecords || []).map(r => ({ id: r.id, type: 'LAB' as const, name: r.testName, date: r.completedAt.toDate(), data: r }));
    const scans = (scanRecords || []).map(r => ({ id: r.id, type: 'SCAN' as const, name: r.scanName, date: r.completedAt.toDate(), data: r }));
    return [...labs, ...scans].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [labRecords, scanRecords]);

  const allPrescriptions: Prescription[] = useMemo(() => 
    (encounters || []).flatMap(e => e.prescription || []),
  [encounters]);

  const handleLogout = () => {
    localStorage.removeItem('mygammed_patient_profile');
    router.push('/patient/login');
  };
  
  const isLoading = !patient || areLabsLoading || areScansLoading || areEncountersLoading || arePaymentsLoading;
  const hasError = labError || scanError || encounterError || paymentError;

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="bg-blue-600 p-8 rounded-b-[50px] shadow-2xl text-white">
        <div className="flex justify-between items-center mb-6">
           <div className="flex items-center gap-2">
              <HeartPulse size={24} className="text-blue-200" />
              <span className="font-black tracking-tighter uppercase text-xl">MyGamMed</span>
           </div>
           <button onClick={handleLogout} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"><LogOut size={20}/></button>
        </div>
        <div className="space-y-1">
           <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Patient EHR Record</p>
           {isLoading && !patient ? <div className="h-9 w-48 bg-white/20 animate-pulse rounded-lg" /> : <h1 className="text-3xl font-black uppercase">{patient?.firstName} {patient?.lastName}</h1>}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8 space-y-8">
        <div className="grid grid-cols-2 gap-4">
           <StatCard label="My Blood Group" value={patient?.bloodGroup || 'N/A'} color="text-red-600" />
           <StatCard label="My NHIS Status" value={patient?.nhisNumber ? 'ACTIVE' : 'N/A'} color="text-green-600" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/patient/portal/book">
            <Button className="w-full h-auto py-6 text-base" size="lg">Book New Appointment</Button>
          </Link>
          <Link href="/patient/portal/appointments">
            <Button className="w-full h-auto py-6 text-base" size="lg" variant="outline">My Upcoming Visits</Button>
          </Link>
        </div>
        
        {hasError && (
             <div className="bg-destructive/10 text-destructive p-6 rounded-2xl text-center">
                 <ServerCrash className="mx-auto mb-2" />
                 <p className="font-bold text-sm">Could not load all records.</p>
                 <p className="text-xs">A security rule may be missing. The system requires `list` access on `lab_orders`, `radiology_orders`, `encounters`, and `payments` collection groups for the portal to work.</p>
             </div>
        )}

        <Section title="Latest Diagnostic Results" icon={<Beaker size={16} className="text-blue-600" />}>
          {isLoading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div> : (
            diagnosticRecords.length === 0 ? <EmptyState text="No recent lab or imaging reports."/> :
            <div className="space-y-3">
              {diagnosticRecords.map(rec => (
                <div key={rec.id} className="bg-white p-5 rounded-[28px] shadow-sm border flex justify-between items-center group hover:border-blue-500 transition-all">
                   <div>
                      <p className="font-black text-black uppercase text-sm">{rec.name}</p>
                      {rec.type === 'LAB' && <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Result: {rec.data.resultValue} {rec.data.unit}</p>}
                      {rec.type === 'SCAN' && <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Impression: {rec.data.impression}</p>}
                   </div>
                   <button className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all"><Download size={18}/></button>
                </div>
              ))}
            </div>
          )}
        </Section>
        
        <Section title="My Active Medications" icon={<Pill size={16} className="text-green-600" />}>
           {isLoading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div> : (
            allPrescriptions.length === 0 ? <EmptyState text="No active prescriptions found." /> :
            <div className="bg-white rounded-[32px] border shadow-sm overflow-hidden divide-y">
              {allPrescriptions.map((rx, idx) => (
                <div key={idx} className="p-5 flex items-center gap-4">
                   <div className="bg-green-50 p-3 rounded-2xl text-green-600"><Pill size={20}/></div>
                   <div>
                      <p className="font-black text-black uppercase text-sm">{rx.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{rx.dosage} • {rx.frequency} ({rx.duration})</p>
                   </div>
                </div>
              ))}
            </div>
           )}
        </Section>

        <Section title="Financial Wallet" icon={<CreditCard size={18} className="text-purple-600" />}>
           {isLoading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div> : (
            payments?.length === 0 ? <EmptyState text="No payment history found." /> :
            <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl space-y-6">
                {payments?.map(p => (
                  <div key={p.id} className="flex justify-between items-center border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                      <div>
                          <p className="font-bold text-white">GHS {p.totalAmount.toFixed(2)}</p>
                          <p className="text-xs text-slate-400">{p.paymentMode} - {format(p.createdAt.toDate(), 'PPP')}</p>
                      </div>
                      <span className="text-xs font-mono bg-green-500/20 text-green-400 px-2 py-1 rounded">PAID</span>
                  </div>
                ))}
            </div>
           )}
        </Section>
      </div>
    </div>
  );
}

const StatCard = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase">{label}</p>
        <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
);

const Section = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            {icon} {title}
        </h3>
        {children}
    </div>
);

const EmptyState = ({ text }: { text: string }) => (
    <div className="p-10 bg-white rounded-[32px] text-center text-slate-400 italic text-sm border-2 border-dashed">
        {text}
    </div>
);
