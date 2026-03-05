'use client';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { 
  TrendingUp, TrendingDown, Zap, 
  AlertCircle, Save, Loader2, RefreshCcw, 
  CheckCircle2 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

export default function BulkPriceUpdater() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('MEDICINE');
  const [method, setMethod] = useState<'PERCENT_INC' | 'PERCENT_DEC' | 'FIXED_INC'>('PERCENT_INC');
  const [value, setValue] = useState<number>(0);
  const [previewItems, setPreviewItems] = useState<any[]>([]);

  const hospitalId = userProfile?.hospitalId;

  const handlePreview = async () => {
    if (!hospitalId || !firestore || value <= 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Please enter a valid adjustment value." });
      return;
    }
    setLoading(true);

    try {
      const q = query(
        collection(firestore, `hospitals/${hospitalId}/product_catalog`), 
        where("category", "==", category)
      );
      const snap = await getDocs(q);
      
      const updates = snap.docs.map(d => {
        const data = d.data();
        const oldPrice = data.sellingPrice || data.basePrice || 0;
        let newPrice = oldPrice;

        if (method === 'PERCENT_INC') newPrice = oldPrice * (1 + value / 100);
        if (method === 'PERCENT_DEC') newPrice = oldPrice * (1 - value / 100);
        if (method === 'FIXED_INC') newPrice = oldPrice + value;

        return {
          id: d.id,
          name: data.name,
          sku: data.sku,
          oldPrice,
          newPrice: parseFloat(newPrice.toFixed(2))
        };
      });

      setPreviewItems(updates);
      toast({ title: "Preview Generated", description: `Previewing price changes for ${updates.length} items.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Preview Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (previewItems.length === 0 || !firestore || !user || !hospitalId) return;
    setLoading(true);
    const batch = writeBatch(firestore);

    try {
      previewItems.forEach(item => {
        const ref = doc(firestore, `hospitals/${hospitalId}/product_catalog`, item.id);
        batch.update(ref, {
          sellingPrice: item.newPrice,
          priceLastUpdated: serverTimestamp(),
          lastAdjustedBy: user.uid
        });
      });

      await batch.commit();
      toast({ title: "Global Tariffs Synchronized Successfully" });
      setPreviewItems([]);
      setValue(0);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Batch Update Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Bulk <span className="text-primary">Tariff Engine</span></h1>
          <p className="text-muted-foreground font-medium">Apply global price adjustments to product categories.</p>
        </div>
      </div>

      <div className="bg-card p-10 rounded-[40px] border shadow-xl grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Target Category</label>
          <Select value={category} onValueChange={(value) => setCategory(value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MEDICINE">Medicines (Pharmacy)</SelectItem>
              <SelectItem value="REAGENT">Lab Reagents</SelectItem>
              <SelectItem value="CONSUMABLE">Clinical Consumables</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Adjustment Method</label>
          <Select value={method} onValueChange={(value: any) => setMethod(value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENT_INC">Percentage Increase (%)</SelectItem>
              <SelectItem value="PERCENT_DEC">Percentage Decrease (%)</SelectItem>
              <SelectItem value="FIXED_INC">Fixed GHS Increase (₵)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Adjustment Value</label>
          <Input 
            type="number" className="font-black text-xl text-center"
            value={value} onChange={e => setValue(parseFloat(e.target.value) || 0)}
          />
        </div>

        <Button 
          onClick={handlePreview} disabled={loading}
          className="bg-primary text-primary-foreground p-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin"/> : <RefreshCcw size={16}/>} Generate Preview
        </Button>
      </div>

      {previewItems.length > 0 && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center bg-primary/10 p-6 rounded-[32px] border border-primary/20">
             <div className="flex items-center gap-3 text-primary">
                <AlertCircle size={24} />
                <p className="text-xs font-black uppercase">Review changes for {previewItems.length} items before committing to clinical billing.</p>
             </div>
             <Button 
                onClick={handleCommit} disabled={loading}
                className="bg-foreground text-background px-10 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-2 hover:bg-green-600 transition-all"
             >
                <CheckCircle2 size={18}/> Commit Prices
             </Button>
          </div>

          <div className="bg-card rounded-[40px] border shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-6 text-[10px] uppercase font-black tracking-widest text-muted-foreground">Product Name / SKU</th>
                  <th className="p-6 text-[10px] uppercase font-black tracking-widest text-muted-foreground text-right">Old Price (GHS)</th>
                  <th className="p-6 text-[10px] uppercase font-black tracking-widest text-muted-foreground text-right">New Price (GHS)</th>
                  <th className="p-6 text-[10px] uppercase font-black tracking-widest text-muted-foreground text-right">Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {previewItems.map(item => (
                  <tr key={item.id} className="hover:bg-muted/50 transition-all">
                    <td className="p-6">
                       <p className="uppercase text-sm font-bold text-card-foreground">{item.name}</p>
                       <p className="text-[10px] text-primary font-black">{item.sku}</p>
                    </td>
                    <td className="p-6 text-right text-muted-foreground italic font-mono">GHS {item.oldPrice.toFixed(2)}</td>
                    <td className="p-6 text-right font-black text-primary font-mono">GHS {item.newPrice.toFixed(2)}</td>
                    <td className="p-6 text-right">
                       <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${item.newPrice > item.oldPrice ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.newPrice > item.oldPrice ? `+GHS ${(item.newPrice - item.oldPrice).toFixed(2)}` : `-GHS ${(item.oldPrice - item.newPrice).toFixed(2)}`}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
