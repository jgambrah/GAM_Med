'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldAlert, Award, Calendar, Plus, UploadCloud } from 'lucide-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

const cpdSubmissionSchema = z.object({
  topic: z.string().min(5, "Topic is too short."),
  provider: z.string().min(3, "Provider name is required."),
  points: z.coerce.number().min(0.5, "Points must be at least 0.5."),
  certificateUrl: z.string().url("Please enter a valid URL."),
});

type CpdFormValues = z.infer<typeof cpdSubmissionSchema>;

export default function MyCpdPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isAddCpdOpen, setIsAddCpdOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  const mySubmissionsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !user) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/cpd_submissions`), where("staffId", "==", user.uid), orderBy('createdAt', 'desc'));
  }, [firestore, hospitalId, user]);

  const { data: submissions, isLoading: areSubmissionsLoading } = useCollection(mySubmissionsQuery);

  const form = useForm<CpdFormValues>({
    resolver: zodResolver(cpdSubmissionSchema),
  });

  const handleAddCpd = (values: CpdFormValues) => {
    if (!firestore || !hospitalId || !user || !userProfile) return;
    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/cpd_submissions`), {
      ...values,
      hospitalId,
      staffId: user.uid,
      staffName: userProfile.fullName,
      role: userProfile.role,
      status: 'PENDING',
      createdAt: serverTimestamp(),
    });
    toast({ title: 'CPD Submitted for Verification' });
    form.reset();
    setIsAddCpdOpen(false);
  };

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
        <div className="flex justify-between items-end border-b pb-6">
            <div>
              <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">My <span className="text-primary">CPD Portfolio</span></h1>
              <p className="text-muted-foreground font-medium">Submit and track your continuous professional development points.</p>
            </div>
             <Dialog open={isAddCpdOpen} onOpenChange={setIsAddCpdOpen}>
                <DialogTrigger asChild>
                    <Button><Plus size={16} /> Submit New CPD</Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Submit CPD for Verification</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleAddCpd)} className="space-y-4">
                            <FormField control={form.control} name="topic" render={({ field }) => (
                            <FormItem><FormLabel>Training/Event Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="provider" render={({ field }) => (
                                    <FormItem><FormLabel>Provider</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="points" render={({ field }) => (
                                    <FormItem><FormLabel>Points Awarded</FormLabel><FormControl><Input type="number" step="0.5" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <FormField control={form.control} name="certificateUrl" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Certificate URL</FormLabel>
                                <FormControl><Input placeholder="https://link.to/your/certificate.pdf" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )} />
                            <DialogFooter>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <UploadCloud size={16} />}
                                    Submit
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard icon={Award} label="Total Verified Points" value={userProfile?.totalCpdPoints || 0} />
            <StatCard icon={Calendar} label="License Expiry" value={userProfile?.licenseExpiry ? format(new Date(userProfile.licenseExpiry), 'PPP') : 'Not Set'} />
        </div>

        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Training/Event</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date Submitted</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {areSubmissionsLoading ? <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="animate-spin"/></TableCell></TableRow> :
                     !submissions || submissions.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center p-12 text-muted-foreground italic">No CPD submissions found.</TableCell></TableRow> :
                     submissions?.map(sub => (
                         <TableRow key={sub.id}>
                            <TableCell>
                                <p className="font-bold uppercase">{sub.topic}</p>
                                <p className="text-xs text-muted-foreground">{sub.provider}</p>
                            </TableCell>
                            <TableCell className="font-bold">{sub.points}</TableCell>
                            <TableCell><Badge variant={sub.status === 'VERIFIED' ? 'default' : (sub.status === 'REJECTED' ? 'destructive' : 'secondary')}>{sub.status}</Badge></TableCell>
                            <TableCell>{sub.createdAt ? format(sub.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                         </TableRow>
                     ))
                    }
                </TableBody>
             </Table>
        </div>
    </div>
  );
}

const StatCard = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) => (
    <div className="bg-card p-6 rounded-[32px] border shadow-sm flex items-center gap-4">
        <div className="p-3 bg-primary/10 text-primary rounded-2xl"><Icon /></div>
        <div>
            <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
            <p className="text-xl font-black">{value}</p>
        </div>
    </div>
);
