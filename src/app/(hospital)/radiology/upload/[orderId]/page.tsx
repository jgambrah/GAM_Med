'use client';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useFirebaseApp, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, serverTimestamp } from 'firebase/firestore';
import { Camera, UploadCloud, FileImage, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function RadiologyUpload() {
  const { orderId } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const app = useFirebaseApp();
  const storage = getStorage(app);
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  const handleUpload = async () => {
    if (!file || !hospitalId || !orderId) {
      toast({ variant: 'destructive', title: "Error", description: "File, hospital, or order ID is missing." });
      return;
    }
    setUploading(true);

    const storageRef = ref(storage, `hospitals/${hospitalId}/radiology/${orderId}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(p);
      }, 
      (error) => {
        toast({ variant: 'destructive', title: "Upload Failed", description: error.message });
        setUploading(false);
      }, 
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          const orderRef = doc(firestore, `hospitals/${hospitalId}/radiology_orders`, orderId as string);
          
          updateDocumentNonBlocking(orderRef, {
            imageUrl: downloadURL,
            imageUploadedAt: serverTimestamp(),
            status: 'IMAGE_READY'
          });

          toast({ title: "Clinical Image Synced to EHR", description: "Radiologist can now report on this scan." });
          setUploading(false);
          router.push('/radiology/queue');
        } catch (error: any) {
           toast({ variant: 'destructive', title: "Update Failed", description: error.message });
           setUploading(false);
        }
      }
    );
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8 text-black font-bold">
        <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2">
            <ArrowLeft size={16} /> Back to Queue
        </Button>
        <h1 className="text-3xl font-black uppercase tracking-tighter italic">Image <span className="text-blue-600">Acquisition</span></h1>
        
        <div className="bg-white p-10 rounded-[40px] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center space-y-6 group hover:border-blue-600 transition-all">
            {file ? (
            <div className="text-center space-y-4">
                <FileImage size={64} className="text-blue-600 mx-auto" />
                <p className="uppercase text-sm">{file.name}</p>
                <button onClick={() => setFile(null)} className="text-[10px] text-red-500 uppercase underline">Change File</button>
            </div>
            ) : (
            <label className="cursor-pointer text-center">
                <UploadCloud size={64} className="text-slate-200 group-hover:text-blue-600 transition-all mx-auto" />
                <p className="mt-4 text-xs text-slate-400 uppercase tracking-widest">Select Scan Image (DICOM/JPG)</p>
                <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
            )}
        </div>

        {uploading && (
           <Progress value={progress} className="w-full h-4" />
        )}

        <Button 
            disabled={!file || uploading}
            onClick={handleUpload}
            className="w-full bg-[#0f172a] text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-blue-600 transition-all disabled:bg-slate-100"
        >
            {uploading ? <Loader2 className="animate-spin" /> : <Camera size={20} />}
            Transmit to Clinical Cloud
        </Button>
    </div>
  );
}
