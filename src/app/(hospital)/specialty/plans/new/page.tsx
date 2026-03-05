'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Zap, Plus, Save, User, Package, 
  Repeat, Calendar, Loader2, ShieldAlert, ChevronsUpDown, Check
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';


const planSchema = z.object({
  patientId: z.string().min(1, "A patient must be selected."),
  unitId: z.string().min(1, "A specialty unit must be selected."),
  frequency: z.string().min(1, "Treatment frequency is required."),
  sessionsAuthorized: z.coerce.number().min(1, "Authorize at least one session."),
  linkedKitSku: z.string().optional(),
});

type PlanFormValues = z.infer<typeof planSchema>;


export default function NewTreatmentPlanPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'DOCTOR', 'ADMIN'].includes(userRole || '');

  // Data fetching
  const patientsQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/patients`)) : null, [firestore, hospitalId]);
  const { data: patients, isLoading: patientsLoading } = useCollection(patientsQuery);

  const unitsQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/specialty_units`)) : null, [firestore, hospitalId]);
  const { data: units, isLoading: unitsLoading } = useCollection(unitsQuery);
  
  const kitsQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/product_catalog`)) : null, [firestore, hospitalId]);
  const { data: kits, isLoading: kitsLoading } = useCollection(kitsQuery);
  
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
  });

  const onSubmit = async (values: PlanFormValues) => {
    if (!user || !userProfile) return;
    setLoading(true);

    const selectedPatient = patients?.find(p => p.id === values.patientId);
    const selectedUnit = units?.find(u => u.id === values.unitId);
    const selectedKit = kits?.find(k => k.sku === values.linkedKitSku);

    if (!selectedPatient || !selectedUnit) {
        toast({ variant: 'destructive', title: "Invalid selection." });
        setLoading(false);
        return;
    }

    try {
        addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/treatment_plans`), {
            ...values,
            patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
            unitName: selectedUnit.name,
            serviceType: selectedUnit.type,
            linkedKitName: selectedKit?.name || null,
            linkedKitPrice: selectedKit?.sellingPrice || 0,
            hospitalId: hospitalId,
            sessionsCompleted: 0,
            status: 'ACTIVE',
            authorizedBy: user.uid,
            authorizedByName: userProfile.fullName,
            createdAt: serverTimestamp()
        });
        toast({ title: 'Treatment Plan Activated', description: `New plan created for ${selectedPatient.firstName}.` });
        router.push('/specialty/dashboard'); // Assume a dashboard exists
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
        setLoading(false);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading;
  if(pageIsLoading) return <Loader2 className="animate-spin" />;

  if(!isAuthorized) return <ShieldAlert className="text-destructive">Access Denied</ShieldAlert>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
       <div className="flex justify-between items-end border-b pb-6">
        <div>
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">New Treatment <span className="text-primary">Plan</span></h1>
           <p className="text-muted-foreground font-medium">Define a recurring, cycle-based treatment protocol.</p>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card p-8 rounded-[40px] border shadow-sm space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Select Patient</FormLabel>
                        <PatientCombobox patients={patients || []} isLoading={patientsLoading} field={field} />
                        <FormMessage />
                    </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="unitId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Specialty Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={unitsLoading}>
                            <FormControl><SelectTrigger><SelectValue placeholder="e.g. Renal Center"/></SelectTrigger></FormControl>
                            <SelectContent>
                                {units?.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.type})</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
              />
           </div>
           <div className="grid grid-cols-2 gap-6">
              <FormField control={form.control} name="frequency" render={({ field }) => (
                <FormItem><FormLabel>Frequency</FormLabel><FormControl><Input placeholder="e.g. 3x Weekly, 1x Monthly" {...field}/></FormControl><FormMessage/></FormItem>
              )}/>
               <FormField control={form.control} name="sessionsAuthorized" render={({ field }) => (
                <FormItem><FormLabel>Total Sessions Authorized</FormLabel><FormControl><Input type="number" {...field}/></FormControl><FormMessage/></FormItem>
              )}/>
           </div>
           <FormField
            control={form.control}
            name="linkedKitSku"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Consumable Kit (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={kitsLoading}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a billable kit for each session"/></SelectTrigger></FormControl>
                        <SelectContent>
                            {kits?.map(k => <SelectItem key={k.id} value={k.sku}>{k.name} - GHS {k.sellingPrice}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
           />
           <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin" /> : <Save />} Authorize Treatment Plan
           </Button>
        </form>
      </Form>
    </div>
  )
}

function PatientCombobox({ patients, isLoading, field }: any) {
  const [open, setOpen] = useState(false);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {field.value
            ? patients.find((p: any) => p.id === field.value)?.ehrNumber
            : isLoading ? "Loading patients..." : "Select Patient..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search by name or EHR..." />
          <CommandList>
            <CommandEmpty>No patient found.</CommandEmpty>
            <CommandGroup>
              {patients.map((p: any) => (
                <CommandItem
                  key={p.id}
                  value={`${p.firstName} ${p.lastName} ${p.ehrNumber}`}
                  onSelect={() => {
                    field.onChange(p.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", field.value === p.id ? "opacity-100" : "opacity-0")} />
                  {p.firstName} {p.lastName} ({p.ehrNumber})
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
    