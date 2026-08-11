'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  FolderOpen, Search, UserPlus, Users, Loader2, Clock, 
  Shield, UserCheck, CheckCircle
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, serverTimestamp } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

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

export default function PatientDirectoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
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
      orderBy('createdAt', 'desc'),
      limit(50)
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* 1. DARK COMMAND HERO BANNER */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        
        {/* Ambient Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic flex items-center gap-3">
              <Users className="w-6 h-6 text-indigo-400" />
              PATIENT DIRECTORY
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">
              Global Master Patient Index & Medical Records
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
              <Shield className="w-4 h-4 text-emerald-400" />
              <div className="text-right">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active Records</span>
                <span className="text-sm font-black text-white">{displayedPatients ? displayedPatients.length : '...'}</span>
              </div>
            </div>

            {['DIRECTOR', 'ADMIN', 'RECEPTIONIST'].includes(userProfile?.role) && (
              <Link href="/patients/register">
                <button className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm transition flex items-center gap-2 uppercase tracking-wide cursor-pointer">
                  <UserPlus className="w-4 h-4" /> Register Patient
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Unified Search Engine Input */}
        <div className="relative z-10">
          <Search className="absolute left-4 top-3.5 text-slate-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search global directory by Name, EHR, GHA ID, or Phone Number..."
            className="w-full pl-12 pr-28 py-3.5 text-sm font-medium bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-indigo-500 rounded-xl text-white placeholder-slate-500 outline-none transition shadow-inner"
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDeepSearch()}
            value={searchTerm}
            disabled={isLoading || arePatientsLoading}
          />
          <div className="absolute right-3 top-2.5">
            <button 
              type="button"
              onClick={handleDeepSearch}
              disabled={isSearching}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[10px] font-bold border border-slate-700 flex items-center gap-1 cursor-pointer"
            >
              {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'ENTER ↵'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. SLEEK DATA GRID TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <th className="py-4 pl-6 text-[10px] font-black text-slate-500 uppercase tracking-widest w-1/3">Patient Identity</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identification IDs</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Contact</th>
                <th className="py-4 pr-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {listIsLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 pl-6"><Skeleton className="h-10 w-48 rounded-xl" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-8 w-36 rounded-lg" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-6 w-24 rounded-lg" /></td>
                    <td className="py-4 pr-6 text-right"><Skeleton className="h-8 w-40 ml-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : (displayedPatients && displayedPatients.length > 0) ? (
                displayedPatients.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition group">
                    
                    {/* Patient Identity */}
                    <td className="py-4 pl-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-black border border-indigo-100 dark:border-indigo-500/20 shrink-0">
                          {p.firstName ? p.firstName.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                            {p.firstName} {p.lastName}
                          </h3>
                          <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 mt-0.5 block">
                            {p.ehrNumber || `EHR-${p.id.slice(0, 6)}`}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Identification IDs (Ghana Card & NHIS Crisp Pills) */}
                    <td className="py-4 px-4 space-y-1.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md uppercase tracking-wider w-fit">
                        {p.ghanaCardId || 'NO CARD'}
                      </span>
                      <br />
                      {p.nhisNumber ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-md uppercase tracking-wider w-fit">
                          NHIS: {p.nhisNumber}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-md uppercase tracking-wider w-fit">
                          NHIS: N/A
                        </span>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="py-4 px-4">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 tracking-wide font-mono">
                        {p.phoneNumber || 'N/A'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 pr-6 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleCheckIn(p.id, `${p.firstName} ${p.lastName}`)}
                        disabled={p.status === 'Awaiting Vitals'}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition shadow-sm uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> 
                        {p.status === 'Awaiting Vitals' ? 'Checked In' : 'Check In'}
                      </button>

                      <Link href={`/patients/folder/${p.id}`} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm uppercase tracking-wider cursor-pointer">
                        <FolderOpen className="w-3.5 h-3.5" /> Open Folder
                      </Link>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="h-48 text-center text-slate-400 py-12">
                    <Users className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs font-bold uppercase">No patient records found</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {searchTerm ? `Your search for "${searchTerm}" returned 0 results.` : 'Register a new patient to populate the facility master index.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
