
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function BillingDashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing & Financials</CardTitle>
        <CardDescription>
          A high-level overview of the hospital's financial status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Financial dashboards and reports will be displayed here.</p>
        </div>
      </CardContent>
    </Card>
  );
}
