'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, increment, serverTimestamp, limit, getDocs, updateDoc } from 'firebase/firestore';
import { 
  BedDouble, Loader2, ShieldAlert, Users, LayoutGrid, 
  ArrowRight, UserPlus, ShieldCheck, Check, Sparkles, 
  RefreshCw, Wrench, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Initial Wards & Beds Fallback for Demo & Fast Loading
const initialWards = [
  { id: 'W-FEM-A', name: 'Female Ward A (General)', capacity: 6 },
  { id: 'W-MAL-B', name: 'Male Ward B (General)', capacity: 6 },
  { id: 'W-VIP-1', name: 'Executive VIP Suites', capacity: 2 },
];

const initialBeds = [
  // Female Ward
  { id: 'B-FA-01', wardId: 'W-FEM-A', label: 'Bed 01', status: 'OCCUPIED', patient: 'ESI ADAZEWAA', ehrId: 'MMH/EHR/26/0002', los: 3 },
  { id: 'B-FA-02', wardId: 'W-FEM-A', label: 'Bed 02', status: 'AVAILABLE', patient: null, ehrId: null, los: null },
  { id: 'B-FA-03', wardId: 'W-FEM-A', label: 'Bed 03', status: 'CLEANING_REQUIRED', patient: null, ehrId: null, los: null },
  { id: 'B-FA-04', wardId: 'W-FEM-A', label: 'Bed 04', status: 'AVAILABLE', patient: null, ehrId: null, los: null },
  { id: 'B-FA-05', wardId: 'W-FEM-A', label: 'Bed 05', status: 'OCCUPIED', patient: 'JANET BONAH', ehrId: 'MMH/EHR/26/0005', los: 2 },
  { id: 'B-FA-06', wardId: 'W-FEM-A', label: 'Bed 06', status: 'AVAILABLE', patient: null, ehrId: null, los: null },
  
  // Male Ward
  { id: 'B-MB-01', wardId: 'W-MAL-B', label: 'Bed 01', status: 'OCCUPIED', patient: 'YAW ANTWI', ehrId: 'MMH/EHR/26/0003', los: 5 },
  { id: 'B-MB-02', wardId: 'W-MAL-B', label: 'Bed 02', status: 'MAINTENANCE', patient: null, ehrId: null, los: null },
  { id: 'B-MB-03', wardId: 'W-MAL-B', label: 'Bed 03', status: 'AVAILABLE', patient: null, ehrId: null, los: null },
  { id: 'B-MB-04', wardId: 'W-MAL-B', label: 'Bed 04', status: 'CLEANING_REQUIRED', patient: null, ehrId: null, los: null },
  { id: 'B-MB-05', wardId: 'W-MAL-B', label: 'Bed 05', status: 'OCCUPIED', patient: 'BENJAMIN HEDIDOR', ehrId: 'MMH/EHR/26/0007', los: 1 },
  { id: 'B-MB-06', wardId: 'W-MAL-B', label: 'Bed 06', status: 'AVAILABLE', patient: null, ehrId: null, los: null },
  
  // VIP Suites
  { id: 'B-VIP-01', wardId: 'W-VIP-1', label: 'Suite Alpha', status: 'OCCUPIED', patient: 'NANA ADWOA', ehrId: 'MMH-00001', los: 1 },
  { id: 'B-VIP-02', wardId: 'W-VIP-1', label: 'Suite Beta', status: 'AVAILABLE', patient: null, ehrId: null, los: null },
];

export default function WardManagementConsole() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [beds, setBeds] = useState(initialBeds);
  const [selectedWard, setSelectedWard] = useState('ALL');
  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        setClaims(idTokenResult.claims);
        setIsClaimsLoading(false);
      });
    } else if (!isUserLoading) {
      setIsClaimsLoading(false);
    }
  }, [user, isUserLoading]);

  const hospitalId = claims?.hospitalId;
  const userRole = claims?.role;
  const isAuthorized = !userRole || ['DIRECTOR', 'ADMIN', 'NURSE', 'DOCTOR', 'HOUSEKEEPING'].includes(userRole);

  // Live Capacity Telemetry Metrics
  const metrics = useMemo(() => {
    const total = beds.length;
    const occupied = beds.filter(b => b.status === 'OCCUPIED').length;
    const cleaning = beds.filter(b => b.status === 'CLEANING_REQUIRED').length;
    const maintenance = beds.filter(b => b.status === 'MAINTENANCE').length;
    const available = beds.filter(b => b.status === 'AVAILABLE').length;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { total, occupied, cleaning, maintenance, available, occupancyRate };
  }, [beds]);

  // Housekeeping Action Handler
  const handleMarkClean = (bedId: string, bedLabel: string) => {
    setBeds(prev => prev.map(b => b.id === bedId ? { ...b, status: 'AVAILABLE' } : b));
    toast({
      title: '✨ Bed Sanitized & Prepped',
      description: `${bedLabel} has been disinfected and is now available for intake.`,
    });
  };

  const isLoading = isUserLoading || isClaimsLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 p-4">
        <div className="text-center max-w-md p-8 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto" />
          <h1 className="text-xl font-black text-white uppercase">Access Restricted</h1>
          <p className="text-xs text-slate-400">Authorized ward personnel only.</p>
          <Button onClick={() => router.push('/dashboard')} className="w-full">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. GAM MED SIGNATURE DARK HERO BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title & Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <BedDouble className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                  WARD & BED COMMAND CENTER
                </h1>
                <p className="mt-1 text-xs md:text-sm text-slate-400 font-medium">
                  REAL-TIME SPATIAL BED MASTER, OCCUPANCY HEATMAP & HOUSEKEEPING QUEUE.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <Link href="/inpatient/rounds">
              <button className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer">
                INPATIENT ROUNDS <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>

        {/* Contextual Capacity Metrics Telemetry Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
          
          {/* Telemetry 1: Total Managed Beds */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
              Total Capacity
            </span>
            <div className="text-2xl md:text-3xl font-black text-white">{metrics.total} Beds</div>
            <span className="text-[10px] font-bold text-slate-500 mt-1 block">Active Inpatient Wards</span>
          </div>

          {/* Telemetry 2: Current Occupancy */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
              Current Occupancy
            </span>
            <div className="text-2xl md:text-3xl font-black text-emerald-400">{metrics.occupancyRate}%</div>
            <span className="text-[10px] font-bold text-slate-500 mt-1 block">{metrics.occupied} Beds Occupied</span>
          </div>

          {/* Telemetry 3: Available Beds */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
              Ready for Intake
            </span>
            <div className="text-2xl md:text-3xl font-black text-sky-400">{metrics.available} Beds</div>
            <span className="text-[10px] font-bold text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Sanitized & Prepped
            </span>
          </div>

          {/* Telemetry 4: Housekeeping Queue */}
          <div className={`p-4 rounded-xl border transition-all ${
            metrics.cleaning > 0 ? 'bg-amber-950/40 border-amber-800/60' : 'bg-slate-900 border-slate-800'
          }`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">
              Housekeeping Queue
            </span>
            <div className="text-2xl md:text-3xl font-black text-amber-400">{metrics.cleaning} Beds</div>
            <span className="text-[10px] font-bold text-amber-300 mt-1 block">Needs Disinfection</span>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. WARD FILTER BAR                         */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button 
            type="button"
            onClick={() => setSelectedWard('ALL')}
            className={`px-4 py-2 text-xs font-black rounded-xl uppercase tracking-wider transition-colors cursor-pointer ${
              selectedWard === 'ALL' 
                ? 'bg-slate-950 text-white shadow-md' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            MASTER WARD VIEW
          </button>
          {initialWards.map(ward => (
            <button 
              key={ward.id}
              type="button"
              onClick={() => setSelectedWard(ward.id)}
              className={`px-4 py-2 text-xs font-black rounded-xl uppercase tracking-wider transition-colors cursor-pointer ${
                selectedWard === ward.id 
                  ? 'bg-slate-950 text-white shadow-md' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {ward.name}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Occupied</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Housekeeping</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Maintenance</span>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. SPATIAL BED MATRIX                      */}
      {/* ========================================== */}
      <div className="space-y-6">
        {initialWards.filter(w => selectedWard === 'ALL' || selectedWard === w.id).map(ward => {
          const wardBeds = beds.filter(b => b.wardId === ward.id);
          
          return (
            <div key={ward.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              
              {/* Ward Header */}
              <div className="bg-slate-100 dark:bg-slate-800/80 p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm md:text-base uppercase tracking-wide">
                  {ward.name}
                </h3>
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-full">
                  CAPACITY: {ward.capacity} BEDS
                </span>
              </div>
              
              {/* Beds Grid */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {wardBeds.map(bed => {
                  const isAvailable = bed.status === 'AVAILABLE';
                  const isOccupied = bed.status === 'OCCUPIED';
                  const isCleaning = bed.status === 'CLEANING_REQUIRED';
                  const isMaintenance = bed.status === 'MAINTENANCE';

                  return (
                    <div 
                      key={bed.id} 
                      className={`relative rounded-2xl border-2 p-5 h-44 flex flex-col justify-between transition-all shadow-sm ${
                        isAvailable ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20' :
                        isOccupied ? 'border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/20' :
                        isCleaning ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/20' :
                        'border-rose-300 dark:border-rose-800/80 bg-rose-50/40 dark:bg-rose-950/20 opacity-80'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase">
                          {bed.label}
                        </span>
                        <div className={`w-3 h-3 rounded-full ${
                          isAvailable ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' :
                          isOccupied ? 'bg-indigo-500 shadow-sm shadow-indigo-500/50' :
                          isCleaning ? 'bg-amber-500 animate-pulse shadow-sm shadow-amber-500/50' : 'bg-rose-500'
                        }`} />
                      </div>

                      {/* Stateful Bed Content */}
                      {isOccupied && (
                        <div className="mt-auto">
                          <p className="font-black text-indigo-950 dark:text-indigo-200 text-sm uppercase truncate">
                            {bed.patient}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold mt-0.5">
                            {bed.ehrId}
                          </p>
                          <span className="inline-block mt-2 text-[9px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950 px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-indigo-200 dark:border-indigo-800">
                            Day {bed.los} of Admission
                          </span>
                        </div>
                      )}

                      {isAvailable && (
                        <div className="mt-auto text-center py-2">
                          <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-100/80 dark:bg-emerald-950/80 py-1 px-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                            READY FOR ADMISSION
                          </p>
                        </div>
                      )}

                      {isCleaning && (
                        <div className="mt-auto flex flex-col gap-2">
                          <p className="text-[9px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest text-center">
                            HOUSEKEEPING PENDING
                          </p>
                          <button 
                            type="button"
                            onClick={() => handleMarkClean(bed.id, bed.label)}
                            className="w-full py-1.5 bg-amber-200 hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-100 border border-amber-400 dark:border-amber-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1"
                          >
                            <Sparkles size={12} /> MARK AS SANITIZED
                          </button>
                        </div>
                      )}

                      {isMaintenance && (
                        <div className="mt-auto text-center py-2">
                          <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest bg-rose-100/80 dark:bg-rose-950/80 py-1 px-2 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center justify-center gap-1">
                            <Wrench size={12} /> OUT OF ORDER
                          </p>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
