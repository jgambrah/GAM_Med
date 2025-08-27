
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { mockPayrollConfig } from '@/lib/data';
import { PayrollConfiguration } from '@/lib/types';
import { Save } from 'lucide-react';

export function PayrollConfigurationDashboard() {
  const { toast } = useToast();
  const [config, setConfig] = React.useState<PayrollConfiguration>(mockPayrollConfig);

  const handleSsnitChange = (field: keyof PayrollConfiguration, value: string) => {
    setConfig(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const handleTaxBandChange = (index: number, field: 'limit' | 'rate', value: string) => {
    const updatedBands = [...config.taxBands];
    if (field === 'limit') {
        updatedBands[index].limit = value === '' ? Infinity : parseFloat(value) || 0;
    } else {
        updatedBands[index].rate = parseFloat(value) || 0;
    }
    setConfig(prev => ({ ...prev, taxBands: updatedBands }));
  };

  const handleSaveChanges = () => {
    // In a real application, this would call a server action to update the configuration in Firestore.
    console.log('Saving new payroll configuration:', config);
    toast.success('Configuration Saved', {
      description: 'The payroll settings have been successfully updated.',
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Statutory Deductions (SSNIT)</CardTitle>
          <CardDescription>
            Configure the rates and ceilings for SSNIT contributions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ssnit-contribution">Employee Contribution Rate (%)</Label>
            <Input
              id="ssnit-contribution"
              type="number"
              step="0.01"
              value={config.ssnitEmployeeContribution * 100}
              onChange={e => handleSsnitChange('ssnitEmployeeContribution', (parseFloat(e.target.value) / 100).toString())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ssnit-ceiling">Annual Pensionable Income Ceiling (GHS)</Label>
            <Input
              id="ssnit-ceiling"
              type="number"
              value={config.ssnitCeiling}
              onChange={e => handleSsnitChange('ssnitCeiling', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
         <CardHeader>
            <CardTitle>Income Tax Brackets (PAYE)</CardTitle>
            <CardDescription>
                Configure the progressive tax bands for annual income. Set limit to empty for the final bracket.
            </CardDescription>
         </CardHeader>
         <CardContent>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Chargeable Annual Income (Up to GHS)</TableHead>
                            <TableHead>Tax Rate (%)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {config.taxBands.map((band, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <Input 
                                        type="number"
                                        placeholder="Infinity"
                                        value={band.limit === Infinity ? '' : band.limit}
                                        onChange={e => handleTaxBandChange(index, 'limit', e.target.value)}
                                    />
                                </TableCell>
                                <TableCell>
                                     <Input 
                                        type="number"
                                        step="0.01"
                                        value={band.rate * 100}
                                        onChange={e => handleTaxBandChange(index, 'rate', (parseFloat(e.target.value) / 100).toString())}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
         </CardContent>
      </Card>
      
      <div className="lg:col-span-2 flex justify-end">
        <Button onClick={handleSaveChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
        </Button>
      </div>
    </div>
  );
}
