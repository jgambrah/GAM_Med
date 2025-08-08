
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BedStatusGrid } from './components/bed-status-grid';
import { AllocateBedDialog } from './components/allocate-bed-dialog';

export default function BedManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold">Bed Management</h1>
            <p className="text-muted-foreground">
            Real-time overview of hospital bed availability and status.
            </p>
        </div>
        <AllocateBedDialog />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Bed Status Dashboard</CardTitle>
          <CardDescription>
            A visual grid of all beds, organized by ward.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BedStatusGrid />
        </CardContent>
      </Card>
    </div>
  );
}
