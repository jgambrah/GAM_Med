
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AddToWaitlistDialog } from './components/add-to-waitlist-dialog';
import { WaitingListsTable } from './components/waiting-lists-table';

export default function WaitingListsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Waiting List Management</h1>
          <p className="text-muted-foreground">
            A central hub for managing patient queues for services and procedures.
          </p>
        </div>
        <AddToWaitlistDialog />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Master Waiting List</CardTitle>
          <CardDescription>
            A prioritized list of all patients awaiting appointments or procedures.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WaitingListsTable />
        </CardContent>
      </Card>
    </div>
  );
}
