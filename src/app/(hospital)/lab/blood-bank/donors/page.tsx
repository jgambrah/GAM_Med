'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, serverTimestamp, doc } from 'firebase/firestore';
import { 
  UserPlus, Droplets, ShieldCheck, 
  Search, Calendar, Phone, Plus, Loader2, ShieldAlert,
  Award, Check, ChevronsUpDown, Eye, Sparkles, Printer, QrCode, FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';

const donorSchema = z.object({
  fullName: z.string().min(3, "Full name is required."),
  phone: z.string().min(10, "A valid phone number is required."),
  bloodGroup: z.string().min(1, "Blood group is required."),
  donorType: z.string().min(1, "Donor type is required."),
  lastDonationDate: z.string().optional(),
  patientId: z.string().optional(),
});

type DonorFormValues = z.infer<typeof donorSchema>;

export default function DonorRegistryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isAddDonorOpen, setIsAddDonorOpen] = useState(false);
  const [selectedCardDonor, setSelectedCardDonor] = useState<any | null>(null);

  // States for Patient selection lookup
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const patientContainerRef = useRef<HTMLDivElement>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'LAB_TECH'].includes(userRole || '');

  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, 'hospitals', hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital } = useDoc(hospitalRef);

  // Query donors
  const donorsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/blood_donors`), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);
  const { data: donors, isLoading: areDonorsLoading } = useCollection(donorsQuery);

  // Query patients for linking
  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/patients`));
  }, [firestore, hospitalId]);
  const { data: patients, isLoading: patientsLoading } = useCollection(patientsQuery);

  const form = useForm<DonorFormValues>({
    resolver: zodResolver(donorSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      bloodGroup: 'O+',
      donorType: 'VOLUNTARY',
      lastDonationDate: '',
      patientId: '',
    },
  });

  // Filter patients lookup
  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    const term = patientSearch.toLowerCase().trim();
    if (!term) return patients;
    return patients.filter((p: any) =>
      `${p.firstName} ${p.lastName} ${p.ehrNumber}`.toLowerCase().includes(term)
    );
  }, [patients, patientSearch]);

  // Click away listener for patient dropdown in modal
  useEffect(() => {
    if (!patientDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (patientContainerRef.current && !patientContainerRef.current.contains(e.target as Node)) {
        setPatientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [patientDropdownOpen]);

  const saveDonor = async (values: DonorFormValues) => {
    if (!firestore || !hospitalId) return;

    try {
      const donorNumber = `DON-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(1000 + Math.random() * 9000)}`;
      addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/blood_donors`), {
        ...values,
        donorNumber,
        hospitalId,
        status: 'ELIGIBLE',
        screeningStatus: 'PENDING',
        donationCount: 0,
        donorTier: 'BRONZE',
        createdAt: serverTimestamp(),
        lastDonationDate: values.lastDonationDate || null,
        patientId: values.patientId || null,
      });
      toast({ title: "Donor Registered Successfully" });
      setIsAddDonorOpen(false);
      form.reset();
      setPatientSearch('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Error", description: e.message });
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'PLATINUM':
        return <span className="text-[10px] font-black text-purple-700 border-2 border-purple-200 bg-purple-50 px-3 py-1 rounded-xl uppercase tracking-wider flex items-center gap-1"><Sparkles size={10} className="fill-purple-300"/> Platinum</span>;
      case 'GOLD':
        return <span className="text-[10px] font-black text-amber-600 border-2 border-amber-300 bg-amber-50 px-3 py-1 rounded-xl uppercase tracking-wider flex items-center gap-1"><Award size={10} className="fill-amber-300"/> Gold</span>;
      case 'SILVER':
        return <span className="text-[10px] font-black text-slate-500 border-2 border-slate-200 bg-slate-50 px-3 py-1 rounded-xl uppercase tracking-wider flex items-center gap-1">Silver</span>;
      case 'BRONZE':
      default:
        return <span className="text-[10px] font-black text-amber-800 border-2 border-amber-200 bg-amber-50 px-3 py-1 rounded-xl uppercase tracking-wider flex items-center gap-1">Bronze</span>;
    }
  };

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin h-16 w-16" /></div>;
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
      <div className="flex justify-between items-end border-b-8 border-red-600 pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Donor <span className="text-red-600">Archive</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Managing Ghana's Gift of Life.</p>
        </div>
        <Dialog open={isAddDonorOpen} onOpenChange={setIsAddDonorOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs tracking-wider rounded-xl"><UserPlus size={16} /> Enroll New Donor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight italic text-red-600">Enroll New Donor Profile</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(saveDonor)} className="space-y-4">
                
                {/* Link to Patient EHR */}
                <div ref={patientContainerRef} className="relative space-y-2">
                  <label className="text-xs uppercase font-bold text-slate-500">Link Patient Folder (Optional)</label>
                  <button
                    type="button"
                    onClick={() => setPatientDropdownOpen(o => !o)}
                    className="w-full flex items-center justify-between rounded-xl border p-3 bg-slate-50 text-sm font-semibold hover:bg-slate-100 transition-all text-left"
                  >
                    <span>
                      {form.watch('patientId') 
                        ? `Linked: ${form.watch('fullName')} (Group ${form.watch('bloodGroup')})`
                        : patientsLoading 
                        ? 'Loading patients...' 
                        : 'Search patient folder directory...'}
                    </span>
                    <ChevronsUpDown size={16} className="text-slate-400" />
                  </button>

                  {patientDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-xl border bg-white shadow-2xl p-2 space-y-2">
                      <div className="flex items-center gap-2 border rounded-lg px-2.5 py-1.5">
                        <Search size={14} className="text-slate-400" />
                        <input
                          type="text"
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          placeholder="Search patient by name or EHR..."
                          className="w-full bg-transparent text-xs outline-none font-medium"
                        />
                      </div>
                      <ul className="max-h-48 overflow-y-auto space-y-1">
                        {filteredPatients.length === 0 ? (
                          <li className="text-center py-6 text-xs text-slate-400 uppercase italic">No patients found.</li>
                        ) : (
                          filteredPatients.map((p: any) => (
                            <li
                              key={p.id}
                              onMouseDown={() => {
                                form.setValue('patientId', p.id);
                                form.setValue('fullName', `${p.firstName} ${p.lastName}`);
                                form.setValue('phone', p.phone || p.phoneNumber || '');
                                if (p.bloodGroup && p.bloodGroup !== 'N/A') {
                                  form.setValue('bloodGroup', p.bloodGroup);
                                }
                                setPatientDropdownOpen(false);
                              }}
                              className="text-xs p-2.5 rounded-lg hover:bg-slate-100 cursor-pointer flex items-center justify-between font-semibold"
                            >
                              <span>{p.firstName} {p.lastName} <span className="text-[10px] text-slate-400 font-mono ml-2">({p.ehrNumber})</span></span>
                              {p.bloodGroup && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[9px] font-black italic">{p.bloodGroup}</span>}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                <FormField name="fullName" control={form.control} render={({field}) => <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" className="rounded-xl border p-3 font-semibold text-sm" {...field} /></FormControl><FormMessage/></FormItem>} />
                <div className="grid grid-cols-2 gap-4">
                   <FormField name="phone" control={form.control} render={({field}) => <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="024XXXXXXX" className="rounded-xl border p-3 font-semibold text-sm" {...field} /></FormControl><FormMessage/></FormItem>} />
                   <FormField name="bloodGroup" control={form.control} render={({field}) => <FormItem><FormLabel>Blood Group</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger className="rounded-xl border p-3 font-semibold text-sm"><SelectValue/></SelectTrigger></FormControl><SelectContent>
                       {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                   </SelectContent></Select><FormMessage/></FormItem>} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField name="donorType" control={form.control} render={({field}) => <FormItem><FormLabel>Donor Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger className="rounded-xl border p-3 font-semibold text-sm"><SelectValue/></SelectTrigger></FormControl><SelectContent>
                     <SelectItem value="VOLUNTARY">Voluntary Donor</SelectItem>
                     <SelectItem value="REPLACEMENT">Replacement (Family)</SelectItem>
                  </SelectContent></Select><FormMessage/></FormItem>} />
                  <FormField name="lastDonationDate" control={form.control} render={({field}) => <FormItem><FormLabel>Last Donation Date</FormLabel><FormControl><Input type="date" className="rounded-xl border p-3 font-semibold text-sm" {...field} /></FormControl><FormMessage/></FormItem>} />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => { setIsAddDonorOpen(false); form.reset(); setPatientSearch(''); }} className="font-bold uppercase text-xs">Cancel</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting} className="bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs tracking-wider rounded-xl">
                    {form.formState.isSubmitting ? <Loader2 className="animate-spin"/> : 'Activate Donor Profile'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900 text-white hover:bg-slate-900">
            <TableRow className="hover:bg-slate-900 border-none">
               <TableHead className="p-6 text-[10px] uppercase text-white font-black">Donor ID & Name</TableHead>
               <TableHead className="p-6 text-[10px] uppercase text-center text-white font-black">Group</TableHead>
               <TableHead className="p-6 text-[10px] uppercase text-white font-black">Type</TableHead>
               <TableHead className="p-6 text-[10px] uppercase text-white font-black">Last Donation</TableHead>
               <TableHead className="p-6 text-center text-white font-black">Tier / Status</TableHead>
               <TableHead className="p-6 text-right text-white font-black">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areDonorsLoading ? <TableRow><TableCell colSpan={6} className="text-center p-12"><Loader2 className="animate-spin text-red-600 h-10 w-10 mx-auto" /></TableCell></TableRow> :
            donors?.map(d => (
              <TableRow key={d.id} className="hover:bg-red-50/20 transition-all font-bold border-slate-50">
                <TableCell className="p-6">
                   <p className="text-sm uppercase tracking-tight text-slate-800">{d.fullName}</p>
                   <p className="text-[10px] text-blue-600 font-mono tracking-wider">ID: {d.donorNumber} • {d.phone}</p>
                   {d.patientId && <span className="bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider mt-1.5 inline-block">EHR LINKED</span>}
                </TableCell>
                <TableCell className="p-6 text-center">
                   <span className="bg-red-600 text-white px-4 py-1 rounded-full text-xs font-black italic shadow-sm">{d.bloodGroup}</span>
                </TableCell>
                <TableCell className="p-6">
                   <span className="text-[9px] font-black bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider text-slate-600">{d.donorType}</span>
                </TableCell>
                <TableCell className="p-6 text-xs text-slate-400">
                   {d.lastDonationDate ? format(new Date(d.lastDonationDate), 'PPP') : 'First Time Donor'}
                </TableCell>
                <TableCell className="p-6 text-center">
                   <div className="flex flex-col items-center gap-1.5">
                     {getTierBadge(d.donorTier || 'BRONZE')}
                     <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">{d.donationCount || 0} Donations</span>
                   </div>
                </TableCell>
                <TableCell className="p-6 text-right">
                   <Button
                     onClick={() => setSelectedCardDonor(d)}
                     variant="outline"
                     size="sm"
                     className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider h-9"
                   >
                     <Eye size={12}/> View Card
                   </Button>
                </TableCell>
              </TableRow>
            ))}
            {!areDonorsLoading && donors?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center p-20 text-slate-300 italic">No donors registered yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      {selectedCardDonor && (
        <DigitalDonorCardDialog
          donor={selectedCardDonor}
          hospital={hospital}
          open={!!selectedCardDonor}
          onOpenChange={() => setSelectedCardDonor(null)}
        />
      )}
    </div>
  );
}

// Digital Blood Donor Privilege Card Component
function DigitalDonorCardDialog({ donor, hospital, open, onOpenChange }: { donor: any; hospital: any; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const donationCount = donor.donationCount || 0;
  const activeTier = donor.donorTier || 'BRONZE';

  // Compute next tier thresholds
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

  const printCard = () => {
    const printContent = document.getElementById('digital-blood-donor-card');
    if (!printContent) return;
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const printWindow = window.open(windowUrl, uniqueName.toString(), 'left=50,top=50,width=800,height=600');
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Blood Donor Card - ${donor.fullName}</title>
            <style>
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: #fff;
              }
              .print-container {
                border: 4px solid #dc2626;
                border-radius: 24px;
                width: 450px;
                height: 260px;
                padding: 24px;
                box-sizing: border-box;
                background: linear-gradient(135deg, #7f1d1d 0%, #1e293b 100%);
                color: white;
                position: relative;
                overflow: hidden;
              }
              .header {
                font-size: 11px;
                font-weight: 900;
                letter-spacing: 2px;
                text-transform: uppercase;
                margin-bottom: 2px;
              }
              .subheader {
                font-size: 9px;
                color: #fbbf24;
                font-weight: 800;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                margin-bottom: 20px;
              }
              .name {
                font-size: 20px;
                font-weight: 900;
                text-transform: uppercase;
                margin: 0 0 6px 0;
                font-style: italic;
              }
              .info {
                font-size: 10px;
                font-family: monospace;
                color: #cbd5e1;
                margin: 2px 0;
              }
              .blood-group-container {
                position: absolute;
                right: 24px;
                top: 24px;
                border: 2px solid rgba(255,255,255,0.2);
                border-radius: 16px;
                background: rgba(255,255,255,0.1);
                width: 80px;
                height: 96px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
              }
              .blood-group {
                font-size: 26px;
                font-weight: 900;
                font-style: italic;
              }
              .badge {
                position: absolute;
                right: 24px;
                bottom: 24px;
                font-size: 9px;
                font-weight: 900;
                padding: 6px 12px;
                border-radius: 8px;
                text-transform: uppercase;
                border: 2px solid;
              }
              .PLATINUM { border-color: #e9d5ff; background: rgba(168,85,247,0.2); color: #f3e8ff; }
              .GOLD { border-color: #fde047; background: rgba(234,179,8,0.2); color: #fef08a; }
              .SILVER { border-color: #cbd5e1; background: rgba(100,116,139,0.2); color: #f1f5f9; }
              .BRONZE { border-color: #fed7aa; background: rgba(194,65,12,0.2); color: #ffedd5; }
              .barcode {
                display: flex;
                gap: 2px;
                background: rgba(255,255,255,0.9);
                padding: 4px;
                border-radius: 4px;
                width: 120px;
                height: 30px;
                margin-top: 16px;
              }
              .bar {
                background: black;
                height: 100%;
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              <div class="header">Ghana National Blood Service</div>
              <div class="subheader">Voluntary Blood Donor Privilege Card</div>
              <div class="name">${donor.fullName}</div>
              <div class="info">DONOR NUMBER: ${donor.donorNumber}</div>
              <div class="info">TEL NO: ${donor.phone}</div>
              <div class="info">STATUS: ACTIVE</div>
              <div class="blood-group-container">
                <span style="font-size: 16px; color: #ef4444;">💧</span>
                <span class="blood-group">${donor.bloodGroup}</span>
              </div>
              <div class="badge ${activeTier}">${activeTier}</div>
              <div class="barcode">
                ${Array.from({ length: 22 }).map((_, i) => `
                  <div class="bar" style="width: ${(i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2)}px;"></div>
                `).join('')}
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white rounded-3xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase italic text-slate-900 tracking-tight flex items-center justify-between">
            <span>Privilege Card View</span>
            <Button onClick={printCard} variant="outline" size="sm" className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 rounded-xl text-xs">
              <Printer size={14}/> Print Card
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Digital Card Graphic */}
        <div 
          id="digital-blood-donor-card"
          className="relative w-full aspect-[1.7/1] rounded-3xl p-6 text-white overflow-hidden shadow-2xl bg-gradient-to-br from-red-800 via-red-950 to-slate-900 border border-red-500/20 flex flex-col justify-between"
        >
          {/* Hologram / dropled watermarks */}
          <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10 pointer-events-none">
            <Droplets size={250} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none" />
          
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-slate-100 flex items-center gap-1.5">
                <Award size={12} className="text-amber-400 fill-amber-400"/> Ghana National Blood Service
              </p>
              <p className="text-[8px] font-bold uppercase text-amber-400 tracking-widest mt-0.5">Voluntary Blood Donor Card</p>
            </div>
            
            {/* Dynamic Glass Tier badge */}
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
            <div className="flex items-center gap-[2px] bg-white/95 p-1.5 rounded-lg h-8 w-32 shadow-inner font-black">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="bg-black h-full" style={{ width: `${(i % 3 === 0 ? 3.5 : i % 2 === 0 ? 1 : 2)}px` }} />
              ))}
            </div>
            
            {/* Blood Capsule display */}
            <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 w-16 h-20 shadow-lg">
              <Droplets className="text-red-500 fill-red-500" size={24} />
              <span className="text-xl font-black italic tracking-tighter mt-0.5">{donor.bloodGroup}</span>
            </div>
          </div>
        </div>

        {/* Share actions & QR Code Scan */}
        <div className="mt-4 p-4 border rounded-2xl bg-slate-50 flex items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 text-black">
            <h4 className="text-xs font-black uppercase text-slate-700 tracking-tight flex items-center gap-1">
              <QrCode size={14} className="text-red-500"/> Share with Donor
            </h4>
            <p className="text-[9px] text-slate-400 font-bold uppercase leading-normal">
              Donor can scan the QR code to save their card on their phone, or copy the link directly.
            </p>
            <Button
              onClick={() => {
                const shareUrl = `${window.location.origin}/donor/card/${donor.hospitalId}/${donor.id}`;
                navigator.clipboard.writeText(shareUrl);
                toast({ title: 'Share Link Copied', description: 'Unique donor card link is now in your clipboard.' });
              }}
              variant="outline"
              size="sm"
              className="border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 rounded-xl mt-1 h-8"
            >
              Copy Shared Link
            </Button>
          </div>
          <div className="bg-white p-2 rounded-xl border shrink-0 flex items-center justify-center">
            <QRCodeSVG
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/donor/card/${donor.hospitalId}/${donor.id}`}
              size={64}
              level="H"
            />
          </div>
        </div>

        {/* Progression tracker */}
        <div className="mt-4 space-y-2 border-t pt-4">
          <div className="flex justify-between text-xs font-black uppercase text-slate-500 font-black">
            <span>Donations: {donationCount}</span>
            {activeTier === 'PLATINUM' ? (
              <span className="text-purple-600 flex items-center gap-1"><Sparkles size={12}/> VIP Maximum Rank</span>
            ) : (
              <span>Next: {tierConfig.nextTier} ({tierConfig.remaining} Left)</span>
            )}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border">
            <div 
              className={cn(
                "h-full transition-all duration-500 rounded-full",
                activeTier === 'PLATINUM' ? 'bg-purple-600' : 'bg-red-600'
              )} 
              style={{ width: `${tierConfig.progress}%` }} 
            />
          </div>
        </div>

        {/* Benefits list */}
        <div className="mt-4 space-y-3">
          <h3 className="text-xs uppercase font-black text-slate-700 tracking-wider flex items-center gap-1.5">
            <FileText size={14} className="text-red-600"/> Current &amp; Locked Clinical Advantages
          </h3>
          <div className="border rounded-2xl overflow-hidden divide-y text-slate-800 text-xs font-semibold bg-slate-50">
            {privileges.map((p, i) => {
              const active = hasAccess(p.tier);
              return (
                <div key={i} className={cn("p-3 flex items-start gap-2.5 transition-all", active ? "bg-green-50/50 text-green-900" : "opacity-45 grayscale bg-white")}>
                  {active ? (
                    <ShieldCheck className="text-green-600 shrink-0 mt-0.5" size={16}/>
                  ) : (
                    <span className="bg-slate-200 text-slate-400 p-0.5 rounded-full shrink-0 mt-0.5 text-[8px] font-black w-4 h-4 flex items-center justify-center">🔒</span>
                  )}
                  <div>
                    <p className="font-bold">{p.text}</p>
                    <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 mt-0.5 block">{p.tier} Privileges</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
