
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AddClaimDialog } from './components/add-claim-dialog';
import { MyClaimsList } from './components/my-claims-list';
import { StaffExpenseClaim } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { mockStaffClaims } from '@/lib/data';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { NewStaffClaimSchema } from '@/lib/schemas';
import { z } from 'zod';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export default function MyClaimsPage() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [allClaims, setAllClaims] = useLocalStorage<StaffExpenseClaim[]>('allStaffClaims', mockStaffClaims);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const myClaims = React.useMemo(() => {
    if (!user) return [];
    return allClaims.filter(c => c.staffId === user.uid).sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
  }, [user, allClaims]);
  
  const form = useForm<z.infer<typeof NewStaffClaimSchema>>({
    resolver: zodResolver(NewStaffClaimSchema),
    defaultValues: {
      claimType: 'Travel',
      amount: 0,
      description: '',
    },
  });

  const handleClaimSubmitted = async (values: z.infer<typeof NewStaffClaimSchema>) => {
      if (!user) {
        toast.error("You must be logged in to submit a claim.");
        return;
      }
      
      let attachmentUrl: string | undefined;

      if (selectedFile) {
        try {
          // This promise ensures we wait for the file to be converted before proceeding.
          attachmentUrl = await fileToDataUrl(selectedFile);
        } catch (error) {
          console.error("Error converting file to Data URL:", error);
          toast.error("Failed to process the attachment. Please try again.");
          return;
        }
      }
      
      const newClaim: StaffExpenseClaim = {
        claimId: `SEC-${Date.now()}`,
        staffId: user.uid,
        staffName: user.name,
        hodId: user.hodId,
        claimType: values.claimType,
        amount: values.amount,
        description: values.description,
        submissionDate: new Date().toISOString(),
        approvalStatus: 'Pending HOD' as const,
        paymentStatus: 'Unpaid' as const,
        attachmentUrl: attachmentUrl,
      };

      setAllClaims(prevClaims => [newClaim, ...prevClaims]);
      toast.success('Your expense claim has been submitted for HOD approval.');
      setIsDialogOpen(false);
      form.reset();
      setSelectedFile(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Expense Claims</h1>
          <p className="text-muted-foreground">
            Submit and track your expense claims for reimbursement.
          </p>
        </div>
        <AddClaimDialog 
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            form={form}
            onFileSelect={setSelectedFile}
            onSubmit={form.handleSubmit(handleClaimSubmitted)}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>My Claim History</CardTitle>
          <CardDescription>
            A record of all your submitted expense claims and their current status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MyClaimsList claims={myClaims} />
        </CardContent>
      </Card>
    </div>
  );
}
