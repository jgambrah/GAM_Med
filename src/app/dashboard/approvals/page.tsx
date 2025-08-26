
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClaimsApprovalDashboard } from './components/claims-approval-dashboard';

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Approvals Workbench</h1>
        <p className="text-muted-foreground">
          Review and approve requests from your team members.
        </p>
      </div>

      <Tabs defaultValue="claims">
        <TabsList>
          <TabsTrigger value="claims">Staff Expense Claims</TabsTrigger>
          <TabsTrigger value="leave" disabled>Leave Requests</TabsTrigger>
        </TabsList>
        <TabsContent value="claims" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Claims Awaiting Approval</CardTitle>
              <CardDescription>
                Review the following expense claims submitted by your direct reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClaimsApprovalDashboard />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
