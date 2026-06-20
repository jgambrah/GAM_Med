'use client';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { 
  Droplets, Award, Sparkles, ShieldCheck, FileText, Loader2, Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PublicSharedDonorCardPage() {
  const { hospitalId, id } = useParams();
  const firestore = useFirestore();

  // Query donor profile
  const donorRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !id) return null;
    return doc(firestore, `hospitals/${hospitalId}/blood_donors`, id as string);
  }, [firestore, hospitalId, id]);
  const { data: donor, isLoading: isDonorLoading } = useDoc(donorRef);

  // Query hospital configurations
  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, 'hospitals', hospitalId as string);
  }, [firestore, hospitalId]);
  const { data: hospital, isLoading: isHospitalLoading } = useDoc(hospitalRef);

  const donationCount = donor?.donationCount || 0;
  const activeTier = donor?.donorTier || 'BRONZE';

  // Compute tier progress
  const tierConfig = useMemo(() => {
    switch (activeTier) {
      case 'PLATINUM':
        return { nextTier: 'MAX', target: donationCount, progress: 100, remaining: 0 };
      case 'GOLD':
        return { nextTier: 'PLATINUM', target: 20, progress: Math.min((donationCount / 20) * 100, 100), remaining: Math.max(20 - donationCount, 0) };
      case 'SILVER':
        return { nextTier: 'GOLD', target: 10, progress: Math.min((donationCount / 10) * 100, 100), remaining: Math.max(10 - donationCount, 0) };
      case 'BRONZE':
      default:
        return { nextTier: 'SILVER', target: 5, progress: Math.min((donationCount / 5) * 100, 100), remaining: Math.max(5 - donationCount, 0) };
    }
  }, [activeTier, donationCount]);

  // Parse privileges from settings dynamically
  const privileges = useMemo(() => {
    const bronzeList = (hospital?.bloodDonorBronzeBenefit || "Verified donor health screening reports & analytics;Priority queuing at blood bank and laboratory desks").split(';').filter(Boolean);
    const silverList = (hospital?.bloodDonorSilverBenefit || "15% discount waiver on standard blood processing fees;Priority queuing at blood bank and laboratory desks").split(';').filter(Boolean);
    const goldList = (hospital?.bloodDonorGoldBenefit || "50% discount waiver on standard blood processing fees;Exemption from family replacement donation requirements").split(';').filter(Boolean);
    const platinumList = (hospital?.bloodDonorPlatinumBenefit || "100% full processing fee waiver for donor and immediate family;Direct VIP billing desk priority").split(';').filter(Boolean);

    return [
      ...bronzeList.map((text: string) => ({ text, tier: 'BRONZE' })),
      ...silverList.map((text: string) => ({ text, tier: 'SILVER' })),
      ...goldList.map((text: string) => ({ text, tier: 'GOLD' })),
      ...platinumList.map((text: string) => ({ text, tier: 'PLATINUM' })),
    ];
  }, [hospital]);

  const hasAccess = (privilegeTier: string) => {
    const ranks: Record<string, number> = { BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4 };
    return ranks[activeTier] >= ranks[privilegeTier];
  };

  const isLoading = isDonorLoading || isHospitalLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-16 w-16 animate-spin text-red-500" />
        <p className="ml-4 mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Loading Donor Card Profile...</p>
      </div>
    );
  }

  if (!donor) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
        <div className="bg-red-500/10 p-6 rounded-full border border-red-500/20 mb-4">
          <Droplets className="h-16 w-16 text-red-500" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tighter italic">Donor Record Not Found</h1>
        <p className="text-slate-400 text-xs mt-2 max-w-sm uppercase font-semibold leading-relaxed">
          The requested blood donor profile does not exist or has been archived. Please contact your healthcare provider.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-6 pb-12 select-none">
      {/* Upper header */}
      <div className="w-full max-w-md flex flex-col items-center text-center mt-6 mb-8">
        <div className="flex items-center gap-1 bg-red-600/10 px-4 py-1.5 rounded-full border border-red-500/20 text-red-400 mb-2">
          <Heart size={14} className="fill-red-500 animate-pulse text-red-500"/>
          <span className="text-[9px] font-black uppercase tracking-wider">Voluntary Blood Donor</span>
        </div>
        <h1 className="text-xl font-black tracking-tight text-white uppercase italic">
          {hospital?.name || 'Ghana National Blood Service'}
        </h1>
        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">Official Member Privilege Card</p>
      </div>

      {/* Card Visual Graphic */}
      <div className="w-full max-w-md aspect-[1.7/1] rounded-[32px] p-6 text-white overflow-hidden shadow-2xl relative bg-gradient-to-br from-red-800 via-red-950 to-slate-900 border border-red-500/20 flex flex-col justify-between mb-8">
        <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10 pointer-events-none">
          <Droplets size={250} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none" />

        <div className="flex justify-between items-start z-10">
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-slate-100 flex items-center gap-1.5">
              <Award size={12} className="text-amber-400 fill-amber-400"/> Ghana National Blood Service
            </p>
            <p className="text-[8px] font-bold uppercase text-amber-400 tracking-widest mt-0.5">Voluntary Blood Donor Card</p>
          </div>
          
          <div className={cn(
            "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border backdrop-blur-md shadow-sm",
            activeTier === 'PLATINUM' && "bg-purple-500/20 text-purple-200 border-purple-400/40",
            activeTier === 'GOLD' && "bg-amber-500/20 text-amber-200 border-amber-400/40",
            activeTier === 'SILVER' && "bg-slate-400/20 text-slate-200 border-slate-300/40",
            activeTier === 'BRONZE' && "bg-orange-500/20 text-orange-200 border-orange-400/40",
          )}>
            {activeTier}
          </div>
        </div>

        <div className="space-y-1 z-10">
          <h2 className="text-2xl font-black italic uppercase tracking-tight truncate max-w-[280px] drop-shadow-md">{donor.fullName}</h2>
          <div className="flex flex-col text-[9px] font-mono text-slate-300">
            <span>DONOR ID: {donor.donorNumber}</span>
            <span>TEL NUMBER: {donor.phone}</span>
          </div>
        </div>

        <div className="flex justify-between items-end mt-2 z-10">
          {/* Mock Barcode */}
          <div className="flex items-center gap-[2px] bg-white/95 p-1.5 rounded-lg h-8 w-32 shadow-inner">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="bg-black h-full" style={{ width: `${(i % 3 === 0 ? 3.5 : i % 2 === 0 ? 1 : 2)}px` }} />
            ))}
          </div>
          
          <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 w-16 h-20 shadow-lg">
            <Droplets className="text-red-500 fill-red-500" size={24} />
            <span className="text-xl font-black italic tracking-tighter mt-0.5">{donor.bloodGroup}</span>
          </div>
        </div>
      </div>

      {/* Progress tracker */}
      <div className="w-full max-w-md bg-slate-900 border rounded-3xl p-6 mb-6">
        <div className="flex justify-between text-xs font-black uppercase text-slate-400 mb-2.5">
          <span>Donations: {donationCount}</span>
          {activeTier === 'PLATINUM' ? (
            <span className="text-purple-400 flex items-center gap-1"><Sparkles size={12}/> VIP Max Rank</span>
          ) : (
            <span>Next: {tierConfig.nextTier} ({tierConfig.remaining} Left)</span>
          )}
        </div>
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
          <div 
            className={cn(
              "h-full transition-all duration-500 rounded-full",
              activeTier === 'PLATINUM' ? 'bg-purple-600' : 'bg-red-600'
            )} 
            style={{ width: `${tierConfig.progress}%` }} 
          />
        </div>
      </div>

      {/* Privileges Sheet */}
      <div className="w-full max-w-md bg-slate-900 border rounded-3xl p-6 space-y-4">
        <h3 className="text-xs uppercase font-black tracking-wider text-slate-300 flex items-center gap-2">
          <FileText size={16} className="text-red-500"/> Unlocked Medical Benefits
        </h3>
        <div className="border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800 text-xs font-semibold bg-slate-950">
          {privileges.map((p, i) => {
            const active = hasAccess(p.tier);
            return (
              <div key={i} className={cn("p-4 flex items-start gap-3 transition-all", active ? "bg-green-950/20 text-green-200 border-green-900/10" : "opacity-30 bg-slate-900 text-slate-400")}>
                {active ? (
                  <ShieldCheck className="text-green-500 shrink-0 mt-0.5" size={16}/>
                ) : (
                  <span className="bg-slate-800 text-slate-500 p-0.5 rounded-full shrink-0 mt-0.5 text-[8px] font-black w-4 h-4 flex items-center justify-center">🔒</span>
                )}
                <div>
                  <p className="font-bold">{p.text}</p>
                  <span className="text-[9px] uppercase font-black tracking-wider text-slate-500 mt-0.5 block">{p.tier} Level</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
