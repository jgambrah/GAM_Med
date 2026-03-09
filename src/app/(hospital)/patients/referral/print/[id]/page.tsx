
'use client';
import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Printer, ArrowLeft, Landmark, FileText, Stethoscope, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function ReferralPrintPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);
  const hospitalId = userProfile?.hospitalId;

  const referralRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    // Referrals are in a top-level collection
    return doc(firestore, `referrals`, id as string);
  }, [firestore, id]);
  const { data: referral, isLoading: isReferralLoading } = useDoc(referralRef);

  const hospitalRef = useMemoFirebase(() => {
    // The hospitalId for the hospital that *issued* the referral is on the referral doc itself
    if (!firestore || !referral?.hospitalId) return null;
    return doc(firestore, "hospitals", referral.hospitalId);
  }, [firestore, referral]);
  const { data: hospital, isLoading: isHospitalLoading } = useDoc(hospitalRef);

  const isLoading = isReferralLoading || isHospitalLoading;
  
  if (isLoading) {
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-[800px] w-full" />
        </div>
    );
  }

  if (!referral) return <div className="p-20 text-center font-black">Referral Not Found.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-black bg-white">
      <div className="print:hidden flex justify-between items-center">
        <Button variant="ghost" onClick={() => router.back()}><ArrowLeft size={16}/> Back</Button>
        <Button onClick={() => window.print()}><Printer size={16}/> Print</Button>
      </div>
      
      <div className="border-[10px] border-double border-slate-900 p-12 font-serif">
        <header className="text-center border-b-4 border-slate-900 pb-6 mb-8">
            <h1 className="text-3xl font-black uppercase tracking-tighter">{hospital?.name}</h1>
            <p className="text-xs font-bold uppercase tracking-wider">{hospital?.region} REGION, GHANA</p>
             <h2 className="bg-slate-900 text-white inline-block px-8 py-1 mt-4 text-sm font-bold uppercase tracking-[0.3em]">
                Medical Referral Form
            </h2>
        </header>

        <section className="mb-10">
            <div className="grid grid-cols-2 gap-8 text-xs uppercase font-bold">
                <div>
                    <p>Date: {referral.createdAt ? new Date(referral.createdAt.toDate()).toLocaleDateString('en-GB') : ''}</p>
                    <p>Referral ID: <span className="font-mono text-blue-600">{referral.referralNumber}</span></p>
                </div>
                 <div className="text-right">
                    <p>Urgency: <span className={referral.urgency === 'EMERGENCY' ? 'text-red-600' : ''}>{referral.urgency}</span></p>
                    <p>From: {hospital?.name}</p>
                </div>
            </div>
            <div className="mt-4 border-2 border-slate-900 p-4 rounded-2xl">
                <p className="text-[10px] uppercase font-black">To:</p>
                <p className="text-lg font-black uppercase text-blue-600">{referral.receivingFacility}</p>
            </div>
        </section>

        <section className="space-y-8">
            <ReferralSection title="Patient Demographics">
                <p><strong>Name:</strong> {referral.patientName}</p>
                <p><strong>EHR Number:</strong> {referral.ehrNumber}</p>
            </ReferralSection>
            
            <ReferralSection title="Provisional Diagnosis">
                <p className="font-bold text-lg">{referral.provisionalDiagnosis}</p>
            </ReferralSection>

            <ReferralSection title="Clinical Summary & Reason for Referral">
                <p className="italic leading-relaxed">"{referral.clinicalSummary}"</p>
            </ReferralSection>
            
            <ReferralSection title="Latest Vitals at Time of Referral">
                <div className="grid grid-cols-3 gap-2">
                    <p><strong>BP:</strong> {referral.vitalsAtReferral?.bp || 'N/A'}</p>
                    <p><strong>Pulse:</strong> {referral.vitalsAtReferral?.pulse || 'N/A'} bpm</p>
                    <p><strong>Temp:</strong> {referral.vitalsAtReferral?.temp || 'N/A'} °C</p>
                </div>
            </ReferralSection>
            
            <ReferralSection title="Active Medications on Referral">
                {referral.medications?.length > 0 ? (
                    <ul className="list-disc list-inside">
                    {referral.medications.map((med: any, i: number) => (
                        <li key={i}>{med.name} - {med.dosage}, {med.frequency}</li>
                    ))}
                    </ul>
                ) : <p>None on record.</p>}
            </ReferralSection>

            <div className="pt-20 grid grid-cols-2 gap-20">
                <div className="border-t-2 border-slate-900 pt-2 text-center">
                    <p className="text-[10px] font-black uppercase">Referring Medical Officer</p>
                    <p className="text-sm font-bold italic mt-2 uppercase">Dr. {referral.referringDoctor}</p>
                </div>
                <div className="border-t-2 border-slate-900 pt-2 text-center">
                    <p className="text-[10px] font-black uppercase">Receiving Officer / Official Stamp</p>
                    <div className="h-12"></div>
                </div>
            </div>
        </section>
      </div>

       <div className="mt-20 border-t pt-4 flex justify-between items-center opacity-30">
         <div className="flex items-center gap-2">
            <Stethoscope size={16}/>
            <span className="text-[8px] font-black uppercase tracking-widest">Generated via GamMed Clinical Intelligence</span>
         </div>
         <p className="text-[8px] font-bold italic">Verification Code: {referral.hospitalId?.slice(0,8)}</p>
      </div>
    </div>
  );
}

const ReferralSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-dashed mb-2 pb-1">{title}</h3>
        <div className="text-sm">{children}</div>
    </div>
);
