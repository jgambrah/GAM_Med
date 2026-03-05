
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, doc, query, serverTimestamp } from 'firebase/firestore';
import { Tag, Save, Plus, Edit3, HeartPulse, Beaker, Camera, BedDouble, Loader2, ShieldAlert, Package, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


export default function TariffManagerPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'ADMIN' || userRole === 'ACCOUNTANT';

  // --- Data Fetching for all service types ---
  const productsQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/product_catalog`)) : null, [firestore, hospitalId]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);
  const generalServicesQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/general_services`)) : null, [firestore, hospitalId]);
  const labMenuQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/lab_menu`)) : null, [firestore, hospitalId]);
  const radiologyMenuQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/radiology_menu`)) : null, [firestore, hospitalId]);
  const procedureMenuQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/procedure_menu`)) : null, [firestore, hospitalId]);

  const { data: generalServices, isLoading: generalLoading } = useCollection(generalServicesQuery);
  const { data: labServices, isLoading: labLoading } = useCollection(labMenuQuery);
  const { data: radiologyServices, isLoading: radiologyLoading } = useCollection(radiologyMenuQuery);
  const { data: procedureServices, isLoading: procedureLoading } = useCollection(procedureMenuQuery);
  
  const updatePrice = (collectionName: string, docId: string, newPriceStr: string, field: 'price' | 'sellingPrice' = 'price') => {
    if (!hospitalId || !firestore) return;
    const newPrice = parseFloat(newPriceStr);
    if (isNaN(newPrice) || newPrice < 0) {
      toast({ variant: 'destructive', title: 'Invalid Price' });
      return;
    }
    const docRef = doc(firestore, `hospitals/${hospitalId}/${collectionName}`, docId);
    updateDocumentNonBlocking(docRef, { [field]: newPrice, priceLastUpdated: serverTimestamp() });
    toast({ title: "Price Synchronized" });
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
          <p className="text-muted-foreground">You are not authorized to manage tariffs.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Tariff <span className="text-primary">Master</span></h1>
          <p className="text-muted-foreground font-medium">Define service fees for automatic patient billing.</p>
        </div>
      </div>

       <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products">Products & Consumables</TabsTrigger>
          <TabsTrigger value="services">Clinical Services</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-6">
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="p-6 text-[10px] uppercase tracking-widest">Product / SKU</TableHead>
                        <TableHead className="p-6 text-[10px] uppercase tracking-widest">Store Type</TableHead>
                        <TableHead className="p-6 text-[10px] uppercase tracking-widest text-center">Purchase Price (GHS)</TableHead>
                        <TableHead className="p-6 text-[10px] uppercase tracking-widest text-right">Selling Price (GHS)</TableHead>
                        <TableHead className="p-6 text-[10px] uppercase tracking-widest text-right">Margin</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {productsLoading && <TableRow><TableCell colSpan={5} className="text-center p-12"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>}
                    {products?.map(p => {
                      const margin = p.sellingPrice > 0 ? (((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100).toFixed(1) : 0;
                      return (
                        <TableRow key={p.id} className="hover:bg-primary/5 transition-all">
                          <TableCell className="p-6">
                            <p className="uppercase text-sm font-bold text-card-foreground">{p.name}</p>
                            <p className="text-[10px] text-primary font-black">{p.sku}</p>
                          </TableCell>
                          <TableCell className="p-6">
                            <span className="text-[9px] font-black bg-muted px-3 py-1 rounded-full text-muted-foreground uppercase">{p.storeType}</span>
                          </TableCell>
                          <TableCell className="p-6 text-center text-muted-foreground font-mono">GHS {p.purchasePrice?.toFixed(2)}</TableCell>
                          <TableCell className="p-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                                <span className="text-[10px] text-primary font-black">GHS</span>
                                <Input 
                                type="number" 
                                className="w-28 p-2 h-auto rounded-xl border-2 font-black text-right"
                                defaultValue={p.sellingPrice || 0}
                                onBlur={(e) => updatePrice('product_catalog', p.id, e.target.value, 'sellingPrice')}
                                />
                            </div>
                          </TableCell>
                          <TableCell className="p-6 text-right">
                            <span className={`text-xs font-black ${Number(margin) < 15 ? 'text-destructive' : 'text-green-600'}`}>
                                {margin}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="services" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <TariffSection 
                title="Clinical & General Services" 
                icon={<HeartPulse size={20}/>} 
                services={generalServices}
                collectionName="general_services"
                onUpdate={updatePrice}
                isLoading={generalLoading}
                />
                <TariffSection 
                title="Laboratory Tests" 
                icon={<Beaker size={20}/>} 
                services={labServices}
                collectionName="lab_menu"
                onUpdate={updatePrice}
                isLoading={labLoading}
                />
                <TariffSection 
                title="Radiology & Imaging" 
                icon={<Camera size={20}/>} 
                services={radiologyServices}
                collectionName="radiology_menu"
                onUpdate={updatePrice}
                isLoading={radiologyLoading}
                />
                <TariffSection 
                title="Clinical Procedures" 
                icon={<Edit3 size={20}/>} 
                services={procedureServices}
                collectionName="procedure_menu"
                onUpdate={updatePrice}
                isLoading={procedureLoading}
                />
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TariffSection({ title, icon, services, collectionName, onUpdate, isLoading }: any) {
  return (
    <div className="bg-card rounded-[32px] border shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2 text-primary border-b pb-3">
        {icon}
        <h3 className="font-black text-xs uppercase tracking-widest text-card-foreground">{title}</h3>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {isLoading && <Loader2 className="animate-spin text-muted-foreground mx-auto" />}
        {!isLoading && services?.length === 0 && <p className="text-center text-xs text-muted-foreground italic py-4">No services in this category.</p>}
        {services?.map((s: any) => (
          <div key={s.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-2xl">
            <span className="font-bold text-sm text-card-foreground uppercase">{s.name}</span>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black text-muted-foreground">GHS</span>
               <Input 
                 type="number"
                 step="0.01" 
                 className="w-24 p-2 h-auto rounded-xl border font-black text-right"
                 defaultValue={s.price.toFixed(2)}
                 onBlur={(e) => onUpdate(collectionName, s.id, e.target.value)}
               />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

    