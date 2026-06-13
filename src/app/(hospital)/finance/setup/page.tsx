'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { Cog, Plus, Loader2, ShieldAlert, Package, Trash2, Search, HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const serviceFormSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export default function GeneralServicesSetupPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'ADMIN' || userRole === 'ACCOUNTANT';

  // --- Real-time subscription to all 4 setup tables ---
  const generalQuery = useMemoFirebase(() => hospitalId && firestore ? query(collection(firestore, `hospitals/${hospitalId}/general_services`)) : null, [firestore, hospitalId]);
  const labQuery = useMemoFirebase(() => hospitalId && firestore ? query(collection(firestore, `hospitals/${hospitalId}/lab_menu`)) : null, [firestore, hospitalId]);
  const radiologyQuery = useMemoFirebase(() => hospitalId && firestore ? query(collection(firestore, `hospitals/${hospitalId}/radiology_menu`)) : null, [firestore, hospitalId]);
  const procedureQuery = useMemoFirebase(() => hospitalId && firestore ? query(collection(firestore, `hospitals/${hospitalId}/procedure_menu`)) : null, [firestore, hospitalId]);

  const { data: generalServices, isLoading: generalLoading } = useCollection(generalQuery);
  const { data: labServices, isLoading: labLoading } = useCollection(labQuery);
  const { data: radiologyServices, isLoading: radiologyLoading } = useCollection(radiologyQuery);
  const { data: procedureServices, isLoading: procedureLoading } = useCollection(procedureQuery);

  // --- Combine all services for display ---
  const allServices = useMemo(() => {
    const list: any[] = [];
    if (generalServices) {
      generalServices.forEach((s: any) => {
        list.push({ ...s, sourceCollection: 'general_services', displayCategory: s.category || 'General Service' });
      });
    }
    if (labServices) {
      labServices.forEach((s: any) => {
        list.push({ ...s, sourceCollection: 'lab_menu', displayCategory: 'Laboratory Test' });
      });
    }
    if (radiologyServices) {
      radiologyServices.forEach((s: any) => {
        list.push({ ...s, sourceCollection: 'radiology_menu', displayCategory: 'Radiology / Imaging' });
      });
    }
    if (procedureServices) {
      procedureServices.forEach((s: any) => {
        list.push({ ...s, sourceCollection: 'procedure_menu', displayCategory: 'Clinical Procedure' });
      });
    }
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [generalServices, labServices, radiologyServices, procedureServices]);

  // --- Filter services based on search query ---
  const filteredServices = useMemo(() => {
    if (!searchQuery) return allServices;
    const lower = searchQuery.toLowerCase();
    return allServices.filter(s => 
      s.name?.toLowerCase().includes(lower) || 
      s.displayCategory?.toLowerCase().includes(lower)
    );
  }, [allServices, searchQuery]);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      category: 'CONSULTATION',
      price: 0
    },
  });

  const handleAddService = (values: ServiceFormValues) => {
    if (!firestore || !hospitalId) return;

    let targetCollection = '';
    let payload: any = {
      name: values.name,
      price: values.price,
      hospitalId,
      createdAt: serverTimestamp(),
    };

    if (values.category === 'LAB_TEST') {
      targetCollection = 'lab_menu';
      payload.category = 'Laboratory';
    } else if (values.category === 'RADIOLOGY_SCAN') {
      targetCollection = 'radiology_menu';
      payload.category = 'Radiology';
    } else if (values.category === 'CLINICAL_PROCEDURE') {
      targetCollection = 'procedure_menu';
      payload.category = 'Procedure';
    } else {
      targetCollection = 'general_services';
      payload.category = values.category;
    }
    
    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/${targetCollection}`), payload);

    toast({
      title: 'Service Added',
      description: `${values.name} has been added successfully.`,
    });
    form.reset({
      name: '',
      category: 'CONSULTATION',
      price: 0
    });
    setIsAddServiceOpen(false);
  };

  const handleDeleteService = async (collectionName: string, serviceId: string, serviceName: string) => {
    if (!firestore || !hospitalId) return;
    try {
      const docRef = doc(firestore, `hospitals/${hospitalId}/${collectionName}`, serviceId);
      await deleteDoc(docRef);
      toast({
        title: 'Service Removed',
        description: `${serviceName} has been removed successfully from ${collectionName === 'general_services' ? 'General Services' : collectionName === 'lab_menu' ? 'Laboratory tests' : collectionName === 'radiology_menu' ? 'Radiology Scans' : 'Clinical Procedures'}.`,
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: e.message,
      });
    }
  };
  
  const isMenuLoading = generalLoading || labLoading || radiologyLoading || procedureLoading;
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
          <p className="text-muted-foreground">You are not authorized to configure services.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Unified Service <span className="text-primary">Setup</span></h1>
           <p className="text-muted-foreground font-medium">Manage clinical services, laboratory tests, radiology scans, and procedures in one central console.</p>
        </div>
         <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus /> Add Service
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Cog /> Configure Service Entry</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddService)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                           <FormItem><FormLabel>Service / Test / Procedure Name</FormLabel><FormControl><Input placeholder="e.g. Ultrasound Scan, Liver Function Test, ECG" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        
                        <div className="grid grid-cols-2 gap-4">
                           <FormField control={form.control} name="category" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="CONSULTATION">Consultation (General Services)</SelectItem>
                                  <SelectItem value="ADMISSION">Ward Admission (General Services)</SelectItem>
                                  <SelectItem value="MATERNITY">Maternity / Delivery (General Services)</SelectItem>
                                  <SelectItem value="WARD_FEE">Ward Fee (General Services)</SelectItem>
                                  <SelectItem value="DOCUMENTATION">Administrative (General Services)</SelectItem>
                                  <SelectItem value="OTHER">Other General Services</SelectItem>
                                  <SelectItem value="LAB_TEST">Laboratory Test (Lab Menu)</SelectItem>
                                  <SelectItem value="RADIOLOGY_SCAN">Radiology / Imaging Scan (Radiology Menu)</SelectItem>
                                  <SelectItem value="CLINICAL_PROCEDURE">Clinical Procedure (Procedure Menu)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="price" render={({ field }) => (
                            <FormItem><FormLabel>Standard Fee (GHS)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>

                         <DialogFooter className="pt-4">
                            <Button type="submit" disabled={form.formState.isSubmitting}>Save to System</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
         </Dialog>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <Input 
          placeholder="Search all services, tests, and procedures..."
          className="w-full pl-12 pr-4 py-5 rounded-2xl border-2 bg-card"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-0">
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Service Name</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Service Category</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Standard Fee (GHS)</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isMenuLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
            ) : filteredServices?.length === 0 ? (
                 <TableRow><TableCell colSpan={4} className="text-center h-48 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2" />
                    No services found matching your criteria.
                </TableCell></TableRow>
            ) : (
                filteredServices?.map(item => (
                <TableRow key={item.id} className="hover:bg-muted/50 transition-all">
                    <TableCell className="p-4 font-bold uppercase tracking-tight text-card-foreground">{item.name}</TableCell>
                    <TableCell className="p-4">
                        <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">
                            {item.displayCategory}
                        </span>
                    </TableCell>
                    <TableCell className="p-4 text-right font-mono font-bold text-card-foreground">{(item.price || 0).toFixed(2)}</TableCell>
                    <TableCell className="p-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10 rounded-full"
                        onClick={() => handleDeleteService(item.sourceCollection, item.id, item.name)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
