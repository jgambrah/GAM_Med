import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BedStatusGrid } from './components/bed-status-grid';

export default function BedManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bed Management</h1>
        <p className="text-muted-foreground">
          Real-time overview of hospital bed availability and status.
        </p>
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
