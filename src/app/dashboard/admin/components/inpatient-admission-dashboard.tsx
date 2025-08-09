
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AllocateBedDialog } from '../../beds/components/allocate-bed-dialog';

export function InpatientAdmissionDashboard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
                <CardTitle>Admit New Inpatient</CardTitle>
                <CardDescription>
                    Use this tool to admit a new or existing patient to a vacant bed.
                </CardDescription>
            </div>
            <AllocateBedDialog />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Admission details will appear here once implemented.</p>
        </div>
      </CardContent>
    </Card>
  );
}
