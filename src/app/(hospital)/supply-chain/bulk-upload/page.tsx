'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, increment } from 'firebase/firestore';
import { 
  FileUp, Table, CheckCircle2, AlertTriangle, 
  Loader2, PackagePlus, ArrowRight, Download 
} from 'lucide-react';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function BulkStockUpload() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [csvData, setCsvData] = useState<any[]>([]);
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const catalogQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/product_catalog`));
  }, [firestore, hospitalId]);
  const { data: catalogData } = useCollection(catalogQuery);

  useEffect(() => {
    if(catalogData) {
      setCatalog(catalogData);
    }
  }, [catalogData]);

  const { toast } = useToast();

  const handleFileChange = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        setLoading(false);
        toast({ title: `${results.data.length} items parsed. Review before committing.` });
      }
    });
  };

  const commitBulkStock = async () => {
    if (csvData.length === 0 || !firestore || !user || !hospitalId) return;
    setUploading(true);
    const batch = writeBatch(firestore);

    try {
      for (const row of csvData) {
        const product = catalog.find(p => p.sku === row.SKU?.trim().toUpperCase());
        
        if (!product) {
          console.error(`Skipping unknown SKU: ${row.SKU}`);
          continue;
        }

        const qty = Number(row.Quantity);
        const cost = Number(row.CostPrice);

        const productRef = doc(firestore, `hospitals/${hospitalId}/product_catalog`, product.id);
        batch.update(productRef, {
          purchasePrice: cost,
          lastPurchasePrice: cost,
          lastStockUpdate: serverTimestamp()
        });

        const moveRef = doc(collection(firestore, `hospitals/${hospitalId}/inventory_movements`));
        batch.set(moveRef, {
          sku: product.sku,
          productName: product.name,
          qty: qty,
          type: 'GRN_RECEIPT', 
          source: 'BULK_UPLOAD',
          destination: row.Store || 'CENTRAL_STORE',
          costPrice: cost,
          expiryDate: row.ExpiryDate || null,
          hospitalId: hospitalId,
          authorizedBy: user?.uid,
          createdAt: serverTimestamp()
        });
      }

      await batch.commit();
      toast({ title: "Bulk Stock Intake Successful",
        description: "Movement logs created. Inventory update needs verification."
      });
      setCsvData([]);
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Handshake Failed: " + e.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-black font-bold">
      <div className="flex justify-between items-end border-b-8 border-slate-900 pb-8">
        <div>
           <h1 className="text-4xl font-black uppercase tracking-tighter italic">Bulk <span className="text-blue-600">Intake Engine</span></h1>
           <p className="text-slate-500 font-bold text-xs uppercase italic">Direct CSV Injection to Hospital Stores.</p>
        </div>
        <button className="bg-slate-100 p-4 rounded-3xl text-slate-400 hover:text-blue-600 transition-all border-2">
           <Download size={20} />
        </button>
      </div>

      <div className="bg-white p-10 rounded-[50px] border-4 border-dashed border-slate-200 hover:border-blue-600 transition-all text-center space-y-4 group">
         <input type="file" accept=".csv" id="csv-upload" className="hidden" onChange={handleFileChange} />
         <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
            <div className="bg-blue-50 p-6 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-all">
               <FileUp size={48} />
            </div>
            <h3 className="mt-6 text-xl font-black uppercase">Select Intake CSV</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Columns: SKU, Quantity, CostPrice, Store, ExpiryDate</p>
         </label>
      </div>

      {csvData.length > 0 && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white rounded-[40px] border-4 border-slate-900 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                 <thead className="bg-slate-900 text-white text-[10px] uppercase font-black">
                    <tr>
                       <th className="p-6">SKU (Master Match)</th>
                       <th className="p-6 text-center">Quantity</th>
                       <th className="p-6">Unit Cost (₵)</th>
                       <th className="p-6">Expiry</th>
                       <th className="p-6">Status</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y-2 divide-slate-50">
                    {csvData.map((row, i) => {
                       const exists = catalog.some(p => p.sku === row.SKU?.trim().toUpperCase());
                       return (
                          <tr key={i} className={exists ? 'bg-white' : 'bg-red-50'}>
                             <td className="p-6">
                                <p className="font-black text-sm">{row.SKU}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{row.Store}</p>
                             </td>
                             <td className="p-6 text-center text-lg">{row.Quantity}</td>
                             <td className="p-6 font-black text-blue-600 italic">₵ {row.CostPrice}</td>
                             <td className="p-6 text-xs text-slate-500">{row.ExpiryDate}</td>
                             <td className="p-6">
                                {exists ? 
                                   <span className="text-[9px] font-black bg-green-100 text-green-700 px-3 py-1 rounded-full uppercase italic">Ready</span> : 
                                   <span className="text-[9px] font-black bg-red-100 text-red-700 px-3 py-1 rounded-full uppercase italic flex items-center gap-1 w-fit"><AlertTriangle size={10}/> SKU Missing</span>
                                }
                             </td>
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>

           <div className="flex gap-4">
              <button onClick={() => setCsvData([])} className="flex-1 p-5 font-black text-slate-400 uppercase text-xs">Clear List</button>
              <button 
                onClick={commitBulkStock}
                disabled={uploading || csvData.some(row => !catalog.some(p => p.sku === row.SKU?.trim().toUpperCase()))}
                className="flex-[2] bg-blue-600 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-black transition-all flex items-center justify-center gap-3 disabled:bg-slate-100 disabled:text-slate-300"
              >
                 {uploading ? <Loader2 className="animate-spin" /> : <PackagePlus size={20} />}
                 Finalize Bulk Intake
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
