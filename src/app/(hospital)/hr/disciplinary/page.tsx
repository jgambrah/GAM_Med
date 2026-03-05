'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, orderBy, serverTimestamp, doc } from 'firebase/firestore';
import { 
  Gavel, AlertCircle, FileText, Plus, 
  ShieldAlert, UserX, MessageSquare, 
  CheckCircle2, Printer, Search, Loader2, Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const recordSchema = z.object({
  staffId: z.string().min(1, "Please select a staff member."),
  offenseType: z.string().min(1, "Offense type is required."),
  severity: z.string().min(1, "Severity level is required."),
  description: z.string().min(10, "A detailed description is required."),
  incidentDate: z.string().min(1, "Incident date is required."),
});

type RecordFormValues = z.infer<typeof recordSchema>;

export default function DisciplinaryRegisterPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<any | null>(null);


  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  
  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'HR_MANAGER'].includes(userRole);

  // Fetch disciplinary records
  const recordsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'disciplinary_records'), orderBy('createdAt', 'desc'));
  }, [firestore, hospitalId]);
  const { data: records, isLoading: areRecordsLoading } = useCollection(recordsQuery);

  // Fetch staff for the dropdown
  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'users'), where('hospitalId', '==', hospitalId), where('is_active', '==', true));
  }, [firestore, hospitalId]);
  const { data: staff, isLoading: areStaffLoading } = useCollection(staffQuery);

  const form = useForm<RecordFormValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      staffId: '',
      offenseType: 'Clinical Negligence',
      severity: 'FORMAL_QUERY',
      description: '',
      incidentDate: '',
    },
  });

  const handleIssueAction = (values: RecordFormValues) => {
    if (!firestore || !user || !hospitalId || !userProfile) return;

    const selectedStaff = staff?.find(s => s.id === values.staffId);
    if (!selectedStaff) return toast({ variant: 'destructive', title: 'Selected staff not found.' });

    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/disciplinary_records`), {
      ...values,
      staffName: selectedStaff.fullName,
      hospitalId: hospitalId,
      issuedBy: user.uid,
      issuedByName: userProfile.fullName,
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
    });

    toast({ title: "Disciplinary Action Recorded" });
    form.reset();
    setIsAddModalOpen(false);
  };
  
  const isLoading = isUserLoading || isProfileLoading;
  
  if (isLoading) {
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
          <p className="text-muted-foreground">This is a confidential module for HR/Director only.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Disciplinary <span className="text-destructive">Register</span></h1>
          <p className="text-muted-foreground font-medium">Formal Governance & Personnel Accountability Log.</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive"><ShieldAlert size={16} /> Record Incident / Query</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-destructive">Log Disciplinary Action</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleIssueAction)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="staffId" render={({ field }) => (
                                <FormItem><FormLabel>Personnel</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={areStaffLoading}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Staff..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {staff?.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>)}
                                    </SelectContent>
                                </Select><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="incidentDate" render={({ field }) => (
                                <FormItem><FormLabel>Incident Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="offenseType" render={({ field }) => (
                                <FormItem><FormLabel>Offense Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Clinical Negligence">Clinical Negligence</SelectItem>
                                        <SelectItem value="Financial Impropriety">Financial Impropriety</SelectItem>
                                        <SelectItem value="Punctuality & Attendance">Punctuality & Attendance</SelectItem>
                                        <SelectItem value="Insubordination">Insubordination</SelectItem>
                                        <SelectItem value="Theft / Loss of Property">Theft / Loss of Property</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="severity" render={({ field }) => (
                                <FormItem><FormLabel>Action Severity</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="FORMAL_QUERY">Issue Formal Query</SelectItem>
                                        <SelectItem value="VERBAL_WARNING">Verbal Warning</SelectItem>
                                        <SelectItem value="WRITTEN_WARNING">Written Warning</SelectItem>
                                        <SelectItem value="FINAL_WRITTEN">Final Written Warning</SelectItem>
                                        <SelectItem value="SUSPENSION">Suspension</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Incident Description</FormLabel>
                            <FormControl><Textarea placeholder="Provide facts, witnesses, and specific details of the breach..." {...field} rows={5}/></FormControl>
                            <FormMessage /></FormItem>
                        )}/>
                        <DialogFooter>
                            <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Commit to Official Record'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-[32px] border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Action / Severity</TableHead>
              <TableHead>Nature of Offense</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areRecordsLoading && <TableRow><TableCell colSpan={5} className="text-center p-12"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>}
            {!areRecordsLoading && records?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="p-20 text-center text-muted-foreground italic uppercase text-xs">No disciplinary cases recorded.</TableCell></TableRow>
            ) : records?.map(rec => (
              <TableRow key={rec.id}>
                <TableCell>
                   <p className="uppercase text-sm font-bold">{rec.staffName}</p>
                   <p className="text-[9px] text-primary font-black">Case Ref: {rec.id.slice(0,6)}</p>
                </TableCell>
                <TableCell>
                   <Badge variant={rec.severity.includes('FINAL') || rec.severity.includes('SUSPENSION') ? 'destructive' : 'secondary'}>
                      {rec.severity.replace(/_/g, ' ')}
                   </Badge>
                </TableCell>
                <TableCell className="text-xs uppercase text-muted-foreground">{rec.offenseType}</TableCell>
                <TableCell className="text-xs">{rec.incidentDate ? format(new Date(rec.incidentDate), 'PPP') : 'N/A'}</TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setViewingRecord(rec)}>
                        <Eye size={16} className="mr-2"/> View Details
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {viewingRecord && (
        <Dialog open={!!viewingRecord} onOpenChange={(open) => !open && setViewingRecord(null)}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Case File: {viewingRecord.id.slice(0,6)}</DialogTitle>
                    <DialogDescription>
                        Disciplinary record for <span className="font-bold">{viewingRecord.staffName}</span> concerning <span className="font-bold">{viewingRecord.offenseType}</span>.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase">Severity</p>
                            <p>{viewingRecord.severity.replace(/_/g, ' ')}</p>
                        </div>
                         <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase">Incident Date</p>
                            <p>{format(new Date(viewingRecord.incidentDate), 'PPP')}</p>
                        </div>
                         <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase">Issued By</p>
                            <p>{viewingRecord.issuedByName}</p>
                        </div>
                         <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase">Status</p>
                            <Badge variant={viewingRecord.status === 'ACTIVE' ? 'outline' : 'default'}>{viewingRecord.status}</Badge>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase">Description of Incident</p>
                        <p className="p-4 bg-muted/50 rounded-lg mt-1 whitespace-pre-wrap">{viewingRecord.description}</p>
                    </div>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setViewingRecord(null)}>Close</Button>
                    <Button><Printer size={16}/> Print Query Letter</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
