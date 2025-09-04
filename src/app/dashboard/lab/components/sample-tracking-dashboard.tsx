
'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebouncedCallback } from 'use-debounce';
import { mockLabResults, allUsers } from '@/lib/data';
import { LabResult, SampleAudit } from '@/lib/types';
import { Search, History, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export function SampleTrackingDashboard() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchResult, setSearchResult] = React.useState<LabResult | null | undefined>(undefined);

  const handleSearch = useDebouncedCallback((query: string) => {
    if (!query) {
      setSearchResult(undefined);
      return;
    }
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const result = mockLabResults.find(r => r.sampleDetails?.barcode === query);
      setSearchResult(result);
      setIsLoading(false);
    }, 500);
  }, 300);

  const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    handleSearch(query);
  };
  
  const getUserName = (userId: string) => allUsers.find(u => u.uid === userId)?.name || 'Unknown';

  const getSampleStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Received in Lab': return 'secondary';
        case 'Collected': return 'default';
        case 'In Transit': return 'outline';
        default: return 'outline';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex w-full max-w-sm items-center space-x-2">
        <Input
          type="text"
          placeholder="Enter sample barcode (e.g., SAMPLE-001)"
          value={searchQuery}
          onChange={onSearchInputChange}
        />
        <Button type="button" onClick={() => handleSearch(searchQuery)} disabled={isLoading}>
          <Search className="h-4 w-4 mr-2" />
          {isLoading ? 'Searching...' : 'Track'}
        </Button>
      </div>

      {searchResult === undefined && !isLoading && (
        <Card>
            <CardHeader>
                <CardTitle>All Samples Overview</CardTitle>
                <CardDescription>A list of all samples currently in the system.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Barcode</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Test</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Collected</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {mockLabResults.filter(r => r.sampleDetails).map(result => (
                            <TableRow key={result.testId}>
                                <TableCell className="font-mono">{result.sampleDetails?.barcode}</TableCell>
                                <TableCell>
                                    <Link href={`/dashboard/patients/${result.patientId}`} className="hover:underline text-primary">
                                        {result.patientName}
                                    </Link>
                                </TableCell>
                                <TableCell>{result.testName}</TableCell>
                                <TableCell>
                                    <Badge variant={getSampleStatusVariant(result.sampleDetails!.sampleStatus)}>{result.sampleDetails!.sampleStatus}</Badge>
                                </TableCell>
                                <TableCell>{format(new Date(result.sampleDetails!.collectionDate), 'PPP p')}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-muted-foreground">Loading sample details...</p>}
      
      {searchResult === null && !isLoading && (
         <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-64 border-destructive/50 bg-destructive/5">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="mt-4 font-semibold text-destructive">No sample found with barcode "{searchQuery}".</p>
            <p className="text-muted-foreground">Please check the barcode and try again.</p>
        </div>
      )}

      {searchResult && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Tracking History for Barcode: {searchResult.sampleDetails?.barcode}</CardTitle>
            <CardDescription>
              An immutable audit trail of the sample's journey for test: {searchResult.testName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Performed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResult.sampleDetails?.auditLog && searchResult.sampleDetails.auditLog.length > 0 ? (
                    searchResult.sampleDetails.auditLog
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((log: SampleAudit) => (
                        <TableRow key={log.auditId}>
                          <TableCell>{format(new Date(log.timestamp), 'PPP p')}</TableCell>
                          <TableCell className="font-medium">{log.action}</TableCell>
                          <TableCell>{log.location}</TableCell>
                          <TableCell>{getUserName(log.userId)}</TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No tracking history found for this sample.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
