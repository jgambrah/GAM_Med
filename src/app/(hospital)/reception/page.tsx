'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FolderOpen, Search, UserPlus, Users, Loader2, Clock } from 'lucide-react';
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

export default function ReceptionPortal() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // New states for server-side search
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

    // Perform three separate checks for maximum reliability in Ghana
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

  // Reset deep search when term is cleared
  useEffect(() => {
    if (searchTerm === '') {
        setDeepSearchResults(null);
    }
  }, [searchTerm])
  
  // --- RENDER LOGIC ---
  const isLoading = isUserLoading || isProfileLoading;
  const listIsLoading = arePatientsLoading || isSearching;
  const displayedPatients = deepSearchResults !== null ? deepSearchResults : filteredRecentPatients;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end border-b-4 border-slate-900 pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Front Desk <span className="text-blue-600">Command</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Patient Identification & Check-In.</p>
        </div>
        <Button asChild className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-xl hover:bg-black transition-all">
          <Link href="/patients/register"><UserPlus size={18} /> New Registration</Link>
        </Button>
      </div>

      <div className="relative">
         <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
         <input 
           placeholder="Search EHR #, Ghana Card, or Phone..."
           className="w-full pl-16 p-6 rounded-[32px] border-4 border-slate-100 bg-white text-black font-black text-lg outline-none focus:border-blue-600 transition-all shadow-sm"
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           onKeyDown={(e) => e.key === 'Enter' && handleDeepSearch()}
         />
      </div>

       <div className="bg-white rounded-[40px] border-2 border-slate-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 border-b-2">
              <TableHead className="p-6">Patient</TableHead>
              <TableHead className="p-6">Status</TableHead>
              <TableHead className="p-6 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listIsLoading ? (
                [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-6 w-3/4" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-1/2" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-10 w-24 ml-auto" /></TableCell>
                    </TableRow>
                ))
            ) : (displayedPatients && displayedPatients.length > 0) ? (
                displayedPatients.map(p => (
                  <TableRow key={p.id} className="hover:bg-blue-50/30 transition-all">
                    <TableCell className="p-6">
                      <p className="font-black text-black uppercase text-sm">{p.firstName} {p.lastName}</p>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">EHR: {p.ehrNumber}</p>
                    </TableCell>
                    <TableCell className="p-6">
                        <span className="text-xs font-bold text-slate-400 uppercase">{p.status || 'Registered'}</span>
                    </TableCell>
                    <TableCell className="p-6 text-right">
                       <Button
                            onClick={() => handleCheckIn(p.id, `${p.firstName} ${p.lastName}`)}
                            disabled={p.status === 'Awaiting Vitals'}
                            className="bg-slate-900 text-white px-6 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-green-600 transition-all"
                        >
                            {p.status === 'Awaiting Vitals' ? 'Checked-In' : 'Check-In Patient'}
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
            ) : (
                 <TableRow>
                    <TableCell colSpan={3} className="h-48 text-center text-slate-400 italic">
                        No patients found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

    </div>
  );
}
