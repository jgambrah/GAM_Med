
'use client';

import * as React from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { mockStaffProfiles, mockAllowances, mockDeductions, mockPositions, mockPayrollRuns, mockPayrollRecords, allUsers, mockTrainingCourses, mockPerformanceReviews } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Plus, Trash2, Download, Building, Mail, Phone, User, GraduationCap, BadgeCheck, FileText, CalendarDays, Shield } from 'lucide-react';
import { StaffProfile, PayrollRecord, Allowance, Deduction, User as UserType, PerformanceReview, TrainingCourse } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

const ItemSchema = z.object({
  name: z.string().min(1, 'You must select an item.'),
  amount: z.coerce.number().min(1, 'Amount must be greater than zero.'),
});

function AddRecurringItemDialog({ staff, itemType, onAdded }: { staff: UserType, itemType: 'Allowance' | 'Deduction', onAdded: (name: string, amount: number) => void }) {
  const [open, setOpen] = React.useState(false);
  
  const form = useForm<z.infer<typeof ItemSchema>>({
    resolver: zodResolver(ItemSchema),
    defaultValues: { name: '', amount: 0 },
  });

  const availableItems: (Allowance | Deduction)[] = itemType === 'Allowance' ? mockAllowances : mockDeductions;

  const onSubmit = (values: z.infer<typeof ItemSchema>) => {
    onAdded(values.name, values.amount);
    toast.success(`${itemType} Added: ${values.name} has been added to ${staff.name}'s profile.`);
    setOpen(false);
    form.reset();
  };

  const getItemKey = (item: Allowance | Deduction) => {
    if ('allowanceId' in item) {
        return item.allowanceId;
    }
    return item.id;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Add {itemType}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Recurring {itemType}</DialogTitle>
          <DialogDescription>
            Add a new recurring {itemType.toLowerCase()} to {staff.name}'s profile.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{itemType} Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select a ${itemType.toLowerCase()} type`} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableItems.map(a => (
                        <SelectItem key={getItemKey(a)} value={a.name}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Amount (₵)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Add {itemType}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function PayrollHistoryTab({ staffId }: { staffId: string }) {
    const staffPayslips = mockPayrollRecords
      .filter(p => p.staffId === staffId)
      .map(p => {
          const run = mockPayrollRuns.find(r => r.runId === p.recordId.split('-')[1]);
          return { ...p, payPeriod: run?.payPeriod || 'N/A' };
      });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Payslip History</CardTitle>
                <CardDescription>A record of all generated payslips for this staff member.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Pay Period</TableHead>
                                <TableHead className="text-right">Gross Pay (₵)</TableHead>
                                <TableHead className="text-right">Net Pay (₵)</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staffPayslips.length > 0 ? (
                                staffPayslips.map((slip) => (
                                    <TableRow key={slip.recordId}>
                                        <TableCell className="font-medium">{slip.payPeriod}</TableCell>
                                        <TableCell className="text-right font-mono">{slip.grossPay.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono font-bold">{slip.netPay.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="link">
                                                <a href={slip.payslipUrl} target="_blank" rel="noopener noreferrer">
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Download Payslip
                                                </a>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
                                        No payroll history found for this staff member.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

const DetailItem = ({ icon: Icon, label, value, children }: { icon: React.ElementType, label: string; value?: string | null; children?: React.ReactNode }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Icon className="h-4 w-4" />{label}</p>
        {value && <p className="text-base font-semibold ml-6">{value}</p>}
        {children && <div className="ml-6">{children}</div>}
    </div>
);


function ProfileDetailsTab({ staff, user }: { staff: UserType, user: UserType | null }) {
    const staffPosition = mockPositions.find(p => p.title.toLowerCase() === staff.role.toLowerCase());
    const isSelf = staff.uid === user?.uid;
    const canEdit = user?.role === 'admin';

    const getExpiryColor = (dateString: string) => {
        const daysToExpiry = differenceInDays(parseISO(dateString), new Date());
        if (daysToExpiry < 0) return 'text-destructive font-semibold';
        if (daysToExpiry <= 60) return 'text-yellow-600 font-semibold';
        return '';
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Personal & Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <DetailItem icon={User} label="Name" value={staff.name} />
                        <DetailItem icon={Mail} label="Email" value={staff.email} />
                        <DetailItem icon={Phone} label="Phone" value={staff.phoneNumber} />
                        <DetailItem icon={CalendarDays} label="Date of Birth" value={staff.dateOfBirth ? format(parseISO(staff.dateOfBirth), 'PPP') : 'N/A'} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Employment Details</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-4">
                        <DetailItem icon={Building} label="Department" value={staff.department} />
                        <DetailItem icon={User} label="Role" value={staff.role} />
                        <DetailItem icon={CalendarDays} label="Hire Date" value={staff.hireDate ? format(parseISO(staff.hireDate), 'PPP') : 'N/A'} />
                     </CardContent>
                </Card>
            </div>
             <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Qualifications & Credentials</CardTitle>
                        {canEdit && <Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" /> Add</Button>}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                             <h4 className="font-semibold text-md flex items-center gap-2 mb-2"><GraduationCap className="h-5 w-5" />Qualifications</h4>
                             {staff.qualifications?.length ? (
                                <ul className="list-disc pl-5 space-y-1">
                                    {staff.qualifications.map((q, i) => <li key={i}>{q.degree} - {q.institution} ({q.graduationYear})</li>)}
                                </ul>
                             ): <p className="text-sm text-muted-foreground">No qualifications on file.</p>}
                        </div>
                        <Separator />
                         <div>
                             <h4 className="font-semibold text-md flex items-center gap-2 mb-2"><BadgeCheck className="h-5 w-5" />Certifications</h4>
                             {staff.certifications?.length ? (
                                <ul className="list-disc pl-5 space-y-1">
                                    {staff.certifications.map((c, i) => (
                                         <li key={i}>{c.name} (Expires: <span className={getExpiryColor(c.expiryDate!)}>{format(parseISO(c.expiryDate!), 'PPP')}</span>)</li>
                                    ))}
                                </ul>
                             ): <p className="text-sm text-muted-foreground">No certifications on file.</p>}
                        </div>
                        <Separator />
                         <div>
                             <h4 className="font-semibold text-md flex items-center gap-2 mb-2"><FileText className="h-5 w-5" />Licenses</h4>
                             {staff.licenses?.length ? (
                                <ul className="list-disc pl-5 space-y-1">
                                    {staff.licenses.map((l, i) => (
                                        <li key={i}>{l.type} - {l.licenseNumber} (Expires: <span className={getExpiryColor(l.expiryDate)}>{format(parseISO(l.expiryDate), 'PPP')}</span>)</li>
                                    ))}
                                </ul>
                             ): <p className="text-sm text-muted-foreground">No licenses on file.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}


function SalaryTab({ staff, setStaff }: { staff: UserType, setStaff: React.Dispatch<React.SetStateAction<UserType | undefined>> }) {
    const staffPosition = mockPositions.find(p => p.title.toLowerCase().includes(staff.role.toLowerCase()));
    
    // For prototype, we need to find the full staff profile to get allowances/deductions
    const fullProfile = mockStaffProfiles.find(p => p.staffId === staff.uid);

    const handleAddAllowance = (name: string, amount: number) => {
        // This is a mock update. In a real app, you'd call a server action.
    };
    
    const handleAddDeduction = (name: string, amount: number) => {
        // This is a mock update. In a real app, you'd call a server action.
    };

    const handleRemoveAllowance = (allowanceName: string) => {};
    const handleRemoveDeduction = (deductionName: string) => {};


    if (!fullProfile) {
        return <p>Detailed salary information not available.</p>
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Salary & Allowances</CardTitle>
                    <CardDescription>Manage recurring payments and benefits.</CardDescription>
                </div>
                <AddRecurringItemDialog staff={staff} itemType="Allowance" onAdded={handleAddAllowance} />
                </CardHeader>
                <CardContent>
                <div className="rounded-md border">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Monthly Amount (₵)</TableHead>
                        <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="font-semibold bg-muted/50">
                        <TableCell>Base Salary ({staffPosition?.title || 'N/A'})</TableCell>
                        <TableCell className="text-right">
                            {((staffPosition?.baseAnnualSalary || 0) / 12).toFixed(2)}
                        </TableCell>
                        <TableCell></TableCell>
                        </TableRow>
                        {fullProfile.recurringAllowances.map((allowance) => (
                        <TableRow key={allowance.name}>
                            <TableCell>{allowance.name}</TableCell>
                            <TableCell className="text-right">{allowance.amount.toFixed(2)}</TableCell>
                            <TableCell>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleRemoveAllowance(allowance.name)}
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Recurring Deductions</CardTitle>
                    <CardDescription>Manage recurring deductions from salary.</CardDescription>
                </div>
                <AddRecurringItemDialog staff={staff} itemType="Deduction" onAdded={handleAddDeduction} />
                </CardHeader>
                <CardContent>
                <div className="rounded-md border">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Monthly Amount (₵)</TableHead>
                        <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fullProfile.recurringDeductions.map((deduction) => (
                        <TableRow key={deduction.name}>
                            <TableCell>{deduction.name}</TableCell>
                            <TableCell className="text-right">{deduction.amount.toFixed(2)}</TableCell>
                            <TableCell>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleRemoveDeduction(deduction.name)}
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </div>
                </CardContent>
            </Card>
        </div>
    )
}

function PerformanceTab({ staff }: { staff: StaffProfile }) {
  const reviews: PerformanceReview[] = mockPerformanceReviews.filter(r => r.employeeId === staff.staffId);
  const goals = staff.developmentGoals || [];

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Development Goals</CardTitle>
            <CardDescription>Current development goals for this staff member.</CardDescription>
          </div>
          <Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4"/> Add Goal</Button>
        </CardHeader>
        <CardContent>
            {goals.length > 0 ? (
                 <ul className="list-disc pl-5 space-y-2">
                    {goals.map(g => (
                        <li key={g.goalId}>
                            <span className="font-semibold">{g.description}</span> (Target: {g.targetDate}) - <Badge>{g.status}</Badge>
                        </li>
                    ))}
                </ul>
            ) : <p className="text-muted-foreground">No development goals set.</p>}
        </CardContent>
       </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Performance Review History</CardTitle>
            <CardDescription>A log of all past performance appraisals.</CardDescription>
          </div>
          <Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4"/> Initiate Review</Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Review Period</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Overall Rating</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.length > 0 ? (
                  reviews.map(review => (
                    <TableRow key={review.reviewId}>
                      <TableCell>{format(new Date(review.ratingPeriodStart), 'PPP')} - {format(new Date(review.ratingPeriodEnd), 'PPP')}</TableCell>
                      <TableCell>{allUsers.find(u => u.uid === review.reviewerId)?.name}</TableCell>
                      <TableCell><Badge>{review.overallRating}</Badge></TableCell>
                      <TableCell><Button variant="link" size="sm">View Report</Button></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No performance reviews on record.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TrainingTab({ staff }: { staff: StaffProfile }) {
    const trainingRecords = staff.trainingRecords || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Training & Certifications</CardTitle>
          <CardDescription>A log of all completed training courses.</CardDescription>
        </div>
        <Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4"/> Log Training</Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Completion Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainingRecords.length > 0 ? (
                trainingRecords.map(record => (
                  <TableRow key={record.trainingId}>
                    <TableCell className="font-medium">{record.courseName}</TableCell>
                    <TableCell>{record.provider}</TableCell>
                    <TableCell>{format(new Date(record.completionDate), 'PPP')}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No training records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityTab({ isSelf, isMfaEnabled, onEnable }: { isSelf: boolean, isMfaEnabled: boolean, onEnable: () => void }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Account Security</CardTitle>
            </CardHeader>
            <CardContent>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Multi-Factor Authentication (MFA)</CardTitle>
                        <CardDescription>
                            Add an extra layer of security to your account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold">Status: <Badge variant={isMfaEnabled ? "secondary" : "destructive"}>{isMfaEnabled ? "Enabled" : "Disabled"}</Badge></p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    When enabled, you will be asked for a code from your authenticator app after logging in.
                                </p>
                            </div>
                            {isSelf && !isMfaEnabled && (
                                <Button onClick={onEnable}>
                                    Enable MFA
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
    );
}

export default function StaffProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const staffId = params.staffId as string;

  const [staff, setStaff] = React.useState<UserType | undefined>(
    allUsers.find((p) => p.uid === staffId)
  );

  const staffProfile = mockStaffProfiles.find(p => p.staffId === staffId);

  if (!staff || !staffProfile) {
    notFound();
  }

  const staffPosition = mockPositions.find(p => p.title.toLowerCase().includes(staff.role.toLowerCase()));
  const isSelf = staff.uid === user?.uid;

  const handleEnableMfa = () => {
      // In a real app, this would trigger a dialog with a QR code and verification step.
      toast.info("Opening MFA Enrollment", {
          description: "This would open a dialog to scan a QR code with an authenticator app."
      })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{staff.name}</h1>
          <p className="text-muted-foreground">
            {staffPosition?.title || 'No Position Assigned'} - ID: {staff.uid}
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="profile">
        <TabsList>
            <TabsTrigger value="profile">Profile Details</TabsTrigger>
            <TabsTrigger value="performance">Performance & Goals</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            {isSelf && <TabsTrigger value="security">Security</TabsTrigger>}
        </TabsList>
         <TabsContent value="profile" className="mt-4">
            <ProfileDetailsTab staff={staff} user={user} />
        </TabsContent>
         <TabsContent value="performance" className="mt-4">
            <PerformanceTab staff={staffProfile} />
        </TabsContent>
         <TabsContent value="training" className="mt-4">
            <TrainingTab staff={staffProfile} />
        </TabsContent>
        <TabsContent value="payroll" className="mt-4">
            <SalaryTab staff={staff} setStaff={setStaff} />
            <div className="mt-6">
                 <PayrollHistoryTab staffId={staff.uid} />
            </div>
        </TabsContent>
        {isSelf && (
            <TabsContent value="security" className="mt-4">
                <SecurityTab isSelf={isSelf} isMfaEnabled={staff.isMfaEnabled || false} onEnable={handleEnableMfa} />
            </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
