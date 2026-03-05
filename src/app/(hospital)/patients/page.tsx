
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

export default function PatientDirectoryPage() {
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
      orderBy('createdAt', 'desc'),
      limit(50) // Fetch up to 50 recent patients for client-side search
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
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">
            Patient <span className="text-primary">Directory</span>
          </h1>
          <p className="text-muted-foreground font-medium">
            Search and manage all patient records in your facility.
          </p>
        </div>
        <Button asChild>
          <Link href="/patients/register">
            <UserPlus />
            Register New Patient
          </Link>
        </Button>
      </div>

       {/* SEARCH BAR */}
       <div className="relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search recent patients by Name, or press Enter for global search..."
          className="w-full pl-12 pr-32 py-4 rounded-2xl border-2 border-slate-200 focus:border-primary outline-none font-bold text-card-foreground bg-card shadow-sm transition-all"
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleDeepSearch()}
          value={searchTerm}
          disabled={isLoading || arePatientsLoading}
        />
        {searchTerm && (
            <Button 
                onClick={handleDeepSearch}
                size="sm"
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
                disabled={isSearching}
            >
                {isSearching ? <Loader2 className="animate-spin" /> : <Search />}
                Search All
            </Button>
        )}
      </div>
      
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-0">
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">EHR Number & Identity</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Identification</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Contact</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listIsLoading ? (
                [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-6 w-3/4" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-1/2" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-1/2" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                ))
            ) : (displayedPatients && displayedPatients.length > 0) ? (
                displayedPatients.map(p => (
                  <TableRow key={p.id} className="hover:bg-muted/50 transition-all">
                    <TableCell className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg"><UserPlus size={20}/></div>
                        <div>
                          <p className="font-black text-card-foreground uppercase tracking-tight">{p.firstName} {p.lastName}</p>
                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{p.ehrNumber}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-4">
                      <p className="text-xs font-bold text-card-foreground">{p.ghanaCardId || 'NO CARD'}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">NHIS: {p.nhisNumber || 'N/A'}</p>
                    </TableCell>
                    <TableCell className="p-4 text-card-foreground font-bold text-xs">
                      {p.phoneNumber}
                    </TableCell>
                    <TableCell className="p-4 text-right">
                       <div className="flex justify-end gap-2">
                        <Button
                            onClick={() => handleCheckIn(p.id, `${p.firstName} ${p.lastName}`)}
                            variant="outline"
                            size="sm"
                            className="font-bold uppercase tracking-widest text-[10px]"
                            disabled={p.status === 'Awaiting Vitals'}
                        >
                            <Clock size={14} /> Check In
                        </Button>
                        <Button asChild variant="secondary" size="sm" className="bg-foreground hover:bg-primary text-background font-bold uppercase tracking-widest text-[10px]">
                            <Link href={`/patients/folder/${p.id}`}>
                                Open Folder <FolderOpen size={14} />
                            </Link>
                        </Button>
                       </div>
                    </TableCell>
                  </TableRow>
                ))
            ) : (
                 <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                        No patients found.
                        {searchTerm ? ` Your search for "${searchTerm}" returned no results.` : ` Register a new patient to begin.`}
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
