
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PharmacyWorkQueue } from './components/pharmacy-work-queue';

export default function PrescriptionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pharmacy Dashboard</h1>
        <p className="text-muted-foreground">
          View and manage all incoming prescription orders.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prescription Fulfillment Queue</CardTitle>
          <CardDescription>
            A real-time list of all prescriptions waiting to be filled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PharmacyWorkQueue />
        </CardContent>
      </Card>
    </div>
  );
}
