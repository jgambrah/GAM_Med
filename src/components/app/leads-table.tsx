'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileQuestion, Rocket } from "lucide-react";
import Link from 'next/link';

interface Lead {
  id: string;
  hospitalName: string;
  contactName: string;
  email: string;
  status: 'new' | 'contacted' | 'demoed' | 'closed';
  createdAt: {
    toDate: () => Date;
  };
}

interface LeadsTableProps {
  leads: Lead[] | null;
  isLoading: boolean;
}

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
    new: 'default',
    contacted: 'secondary',
    demoed: 'outline',
    closed: 'destructive',
}

export function LeadsTable({ leads, isLoading }: LeadsTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <Card className="w-full flex flex-col items-center justify-center min-h-[300px] border-dashed">
        <CardContent className="text-center p-6">
            <FileQuestion className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-xl font-headline font-semibold text-muted-foreground">No leads yet</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">New demo requests will appear here as they are submitted.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Incoming Leads</CardTitle>
        <CardDescription>Review and provision new leads from the public website.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hospital</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Date Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <div className="font-medium">{lead.hospitalName}</div>
                </TableCell>
                <TableCell>
                  <div>{lead.contactName}</div>
                  <div className="text-muted-foreground text-sm">{lead.email}</div>
                </TableCell>
                <TableCell>{lead.createdAt.toDate().toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[lead.status] || 'secondary'}>{lead.status.toUpperCase()}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm">
                    <Link href={{
                        pathname: '/app-ceo/onboard',
                        query: {
                            hospitalName: lead.hospitalName,
                            directorName: lead.contactName,
                            directorEmail: lead.email,
                        }
                    }}>
                        <Rocket className="mr-2" />
                        Provision
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

    