
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockResources } from '@/lib/data';

export default function ResourceListPage() {
  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold">Resource Management</h1>
        <p className="text-muted-foreground">
          View and manage all bookable hospital assets.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Resource Catalog</CardTitle>
          <CardDescription>A list of all bookable resources.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockResources.map((resource) => (
                  <TableRow key={resource.resourceId}>
                    <TableCell className="font-medium">{resource.name}</TableCell>
                    <TableCell>{resource.type}</TableCell>
                    <TableCell>{resource.department}</TableCell>
                    <TableCell>
                      <Badge variant={resource.isBookable ? 'secondary' : 'outline'}>
                        {resource.isBookable ? 'Bookable' : 'Not Bookable'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/admin/resources/${resource.resourceId}`}>
                          View Calendar
                        </Link>
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
  );
}
