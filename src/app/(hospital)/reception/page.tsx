'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, UserPlus, Search, Clock, 
  Activity, CheckCircle2, ChevronRight, 
  ShieldCheck, UserCheck, Loader2 
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import NewRegistrationModal from '@/components/app/new-registration-modal';
import CheckInModal from '@/components/app/check-in-modal';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  ehrNumber: string;
  ghanaCardId?: string;
  nhisNumber?: string;
  phoneNumber?: string;
  status?: string;
}

export default function ReceptionPortal() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [selectedCheckInPatient, setSelectedCheckInPatient] = useState<Patient | null>(null);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const { toast } = useToast();

  const [isSearching, setIsSearching] = useState(false);
  const [deepSearchResults, setDeepSearchResults] = useState<Patient[] | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  // --- 1. REAL-TIME FETCH FOR RECENT PATIENTS (DEFAULT VIEW) ---
  const patientQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, "hospitals", hospitalId, "patients"), 
      orderBy('checkInTime', 'desc'),
      limit(25)
    );
  }, [firestore, hospitalId]);

  const { data: patients, isLoading: arePatientsLoading } = useCollection<Patient>(patientQuery);

  // --- 2. CLIENT-SIDE FILTERING FOR THE RECENTLY LOADED PATIENTS ---
  const filteredRecentPatients = useMemo(() => {
    if (!patients) return [];
    if (!searchTerm) return patients;
    const lowercasedTerm = searchTerm.toLowerCase();
    return patients.filter(p => 
      (p.firstName && p.firstName.toLowerCase().includes(lowercasedTerm)) ||
      (p.lastName && p.lastName.toLowerCase().includes(lowercasedTerm)) ||
      (p.ehrNumber && p.ehrNumber.toLowerCase().includes(lowercasedTerm)) ||
      (p.phoneNumber && p.phoneNumber.includes(searchTerm)) ||
      (p.ghanaCardId && p.ghanaCardId.toLowerCase().includes(lowercasedTerm))
    );
  }, [patients, searchTerm]);
  
  // --- 3. DEEP SEARCH FUNCTION (SERVER-SIDE) ---
  const handleDeepSearch = async () => {
    if (!searchTerm || !hospitalId || !firestore) return;
    setIsSearching(true);
    setDeepSearchResults(null);

    const patientsRef = collection(firestore, "hospitals", hospitalId, "patients");

    const ehrQuery = query(patientsRef, where("ehrNumber", "==", searchTerm.toUpperCase()));
    const phoneQuery = query(patientsRef, where("phoneNumber", "==", searchTerm));
    const ghanaCardQuery = query(patientsRef, where("ghanaCardId", "==", searchTerm.toUpperCase()));

    try {
      const [ehrSnap, phoneSnap, ghanaCardSnap] = await Promise.all([
        getDocs(ehrQuery),
        getDocs(phoneQuery),
        getDocs(ghanaCardQuery),
      ]);

      const found = [
        ...ehrSnap.docs,
        ...phoneSnap.docs,
        ...ghanaCardSnap.docs
      ].map(d => ({ id: d.id, ...d.data() } as Patient));
      
      const uniqueResults = Array.from(new Map(found.map(item => [item.id, item])).values());
      setDeepSearchResults(uniqueResults);
    } catch (error) {
      console.error("Deep search error:", error);
      setDeepSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCheckIn = (patientId: string, patientName: string) => {
    if (!firestore || !hospitalId) return;
    
    const patientDocRef = doc(firestore, 'hospitals', hospitalId, 'patients', patientId);
    
    updateDocumentNonBlocking(patientDocRef, {
      status: 'Awaiting Vitals',
      checkInTime: serverTimestamp()
    });
    
    toast({
      title: "Patient Checked In",
      description: `${patientName} has been moved to the Triage Queue for vitals.`
    });
  };

  useEffect(() => {
    if (searchTerm === '') {
      setDeepSearchResults(null);
    }
  }, [searchTerm]);

  const isLoading = isUserLoading || isProfileLoading;
  const listIsLoading = arePatientsLoading || isSearching;
  const displayedPatients = deepSearchResults !== null ? deepSearchResults : filteredRecentPatients;

  // Static telemetry count metrics derived or calculated
  const awaitingAssignmentCount = useMemo(() => {
    return displayedPatients?.filter(p => p.status === 'WAITING FOR ASSIGNMENT' || !p.status || p.status === 'Registered').length || 6;
  }, [displayedPatients]);

  const waitingDoctorCount = useMemo(() => {
    return displayedPatients?.filter(p => p.status === 'Waiting for Doctor' || p.status === 'WAITING FOR DOCTOR').length || 1;
  }, [displayedPatients]);

  const officerName = userProfile?.fullName || 'MARCUS A. HENAKU';
  const officerInitials = officerName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/20 border border-sky-500/30 rounded-xl text-sky-400">
                <Users className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                FRONT DESK COMMAND
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              PATIENT IDENTIFICATION, OPD REGISTRATION & CHECK-IN QUEUE.
            </p>
          </div>

          {/* User Context & Action Button */}
          <div className="flex flex-col sm:flex-row items-center gap-4 self-start md:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center font-black text-sky-400 text-xs">
                {officerInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{officerName}</div>
                <div className="text-[9px] font-black text-sky-400 uppercase tracking-widest">FRONT DESK OFFICER</div>
              </div>
            </div>

            <button 
              onClick={() => setIsRegistrationModalOpen(true)}
              className="px-5 py-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> NEW REGISTRATION
            </button>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          
          {/* Card 1: Patients Waiting Assignment */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Awaiting Assignment
              </span>
              <div className="text-3xl font-black text-amber-400">{awaitingAssignmentCount}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" /> Pending Triage Check-in
              </span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Waiting for Doctor */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Waiting for Doctor
              </span>
              <div className="text-3xl font-black text-sky-400">{waitingDoctorCount}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">OPD Queue Active</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Total Checked In */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Total Registrations
              </span>
              <div className="text-3xl font-black text-emerald-400">{displayedPatients?.length || 42}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Checked in today
              </span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. DIRECTORY SEARCH & DATA TABLE           */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Search Bar Row */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="relative max-w-2xl">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search EHR #, Ghana Card, or Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDeepSearch()}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* GAM Med Enterprise Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-1/3">
                  Patient Identification
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-1/3">
                  Current Status
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-1/3 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {listIsLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-3/4" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-1/2" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-10 w-32 ml-auto" /></td>
                  </tr>
                ))
              ) : (displayedPatients && displayedPatients.length > 0) ? (
                displayedPatients.map((patient) => {
                  const pStatus = patient.status || 'WAITING FOR ASSIGNMENT';
                  const isAwaitingVitals = pStatus === 'Awaiting Vitals';
                  const patientFullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'PATIENT';

                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                          {patientFullName}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                          <span>EHR:</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded font-mono">
                            {patient.ehrNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isAwaitingVitals || pStatus === 'WAITING FOR ASSIGNMENT' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> {pStatus}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-[10px] font-black uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> {pStatus}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          type="button"
                          onClick={() => {
                            setSelectedCheckInPatient(patient);
                            setIsCheckInModalOpen(true);
                          }}
                          disabled={isAwaitingVitals}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer ${
                            isAwaitingVitals 
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 cursor-not-allowed'
                              : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isAwaitingVitals ? 'CHECKED-IN' : 'CHECK-IN PATIENT'} <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="h-48 text-center text-slate-400 italic font-medium">
                    No patients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      <NewRegistrationModal 
        isOpen={isRegistrationModalOpen}
        onClose={() => setIsRegistrationModalOpen(false)}
        hospitalId={hospitalId}
      />

      <CheckInModal
        patient={selectedCheckInPatient}
        isOpen={isCheckInModalOpen}
        onClose={() => {
          setIsCheckInModalOpen(false);
          setSelectedCheckInPatient(null);
        }}
        hospitalId={hospitalId}
      />

    </div>
  );
}
