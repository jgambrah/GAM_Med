'use client';

import * as React from 'react';
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
import { mockLedgerAccounts, mockLedgerEntries } from '@/lib/data';
import { LedgerAccount, LedgerEntry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { CreateLedgerAccountDialog } from '../reports/components/create-ledger-account-dialog';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Trash2, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/app/dashboard/patients/components/delete-confirmation-dialog';
import { useAuth } from '@/hooks/use-auth';

/**
 * == SaaS General Ledger: Chart of Accounts ==
 * 
 * Displays the structural financial framework for the hospital.
 * Enforces strict logical isolation via the hospitalId wall.
 */
export function ChartOfAccountsTable({ hideHeader = false }: { hideHeader?: boolean }) {
    const { user } = useAuth();
    const [accounts, setAccounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', mockLedgerAccounts);
    const [entries] = useLocalStorage<LedgerEntry[]>('ledgerEntries', mockLedgerEntries);
    const [accountToDelete, setAccountToDelete] = React.useState<LedgerAccount | null>(null);

    // SaaS LOGIC: Only show accounts for the current facility (MANDATORY WALL)
    const hospitalAccounts = React.useMemo(() => {
        if (!user?.hospitalId) return [];
        return accounts.filter(acc => acc.hospitalId === user.hospitalId);
    }, [accounts, user?.hospitalId]);

    const organizedAccounts = React.useMemo(() => {
        const accountsMap = new Map<string, LedgerAccount & { children: LedgerAccount[] }>();
        const rootAccounts: (LedgerAccount & { children: LedgerAccount[] })[] = [];

        // Initialize all accounts in the map
        hospitalAccounts.forEach(acc => {
            accountsMap.set(acc.accountId, { ...acc, children: [] });
        });

        // Populate children arrays and identify root accounts
        hospitalAccounts.forEach(acc => {
            if (acc.isSubLedger && acc.parentAccountId) {
                const parent = accountsMap.get(acc.parentAccountId);
                if (parent) {
                    parent.children.push(accountsMap.get(acc.accountId)!);
                } else {
                    rootAccounts.push(accountsMap.get(acc.accountId)!);
                }
            } else if (!acc.isSubLedger) {
                 rootAccounts.push(accountsMap.get(acc.accountId)!);
            }
        });
        
        rootAccounts.forEach(parent => {
            parent.children.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
        });

        rootAccounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

        return rootAccounts;

    }, [hospitalAccounts]);
    
  const handleAccountCreated = (newAccount: LedgerAccount) => {
    setAccounts(prev => [...prev, newAccount]);
  };
  
  const handleAttemptDelete = (account: LedgerAccount) => {
    if (Math.abs(account.balance) > 0.001) {
      toast.error('Financial Restriction', { description: 'Cannot delete account with a non-zero balance.' });
      return;
    }
    
    const hasTransactions = entries.some(entry => entry.accountId === account.accountId);
    if (hasTransactions) {
        toast.error('Audit Restriction', { description: 'Cannot delete an account with existing transactions.' });
        return;
    }

    setAccountToDelete(account);
  };
  
  const handleConfirmDelete = () => {
    if (!accountToDelete) return;
    setAccounts(prev => prev.filter(acc => acc.accountId !== accountToDelete.accountId));
    toast.success(`Account Deleted`, { description: `"${accountToDelete.accountName}" removed from registry.` });
    setAccountToDelete(null);
  };

  if (!user?.hospitalId) return null;

  return (
    <>
    <div className="space-y-6">
      <Card className="shadow-md border-none ring-1 ring-slate-200 overflow-hidden">
        {!hideHeader && (
          <CardHeader className="flex flex-row justify-between items-center bg-muted/20 border-b">
            <div>
              <CardTitle className="text-lg">Facility Chart of Accounts</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest">Structural Ledger Scoping: <strong>{user.hospitalId}</strong></CardDescription>
            </div>
            <CreateLedgerAccountDialog onAccountCreated={handleAccountCreated} />
          </CardHeader>
        )}
        <CardContent className={hideHeader ? "pt-6" : "pt-6"}>
          <div className="rounded-xl border bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase pl-6">Code</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Account Name</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Category</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Balance (₵)</TableHead>
                  <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Management</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizedAccounts.length > 0 ? organizedAccounts.map((account) => (
                    <React.Fragment key={`${account.accountId}-fragment`}>
                        <TableRow className="bg-muted/10 font-bold group">
                            <TableCell className="pl-6 font-mono text-xs">{account.accountCode}</TableCell>
                            <TableCell className="flex items-center gap-2">
                                <Link href={`/dashboard/admin/chart-of-accounts/${account.accountId}`} className="hover:underline text-primary">
                                    <span>{account.accountName}</span>
                                </Link>
                                <Badge variant="outline" className="text-[8px] font-black uppercase h-4 bg-white">Control</Badge>
                            </TableCell>
                            <TableCell className="text-[10px] font-bold text-muted-foreground uppercase">{account.accountType}</TableCell>
                            <TableCell className="text-right font-black font-mono text-slate-900">₵{account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right pr-6 space-x-2">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <CreateLedgerAccountDialog 
                                        onAccountCreated={handleAccountCreated} 
                                        parentAccountId={account.accountId}
                                        trigger={
                                            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase">
                                                Sub-Ledger
                                            </Button>
                                        }
                                    />
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAttemptDelete(account)}>
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                        {account.children.map(child => (
                            <TableRow key={child.accountId} className="hover:bg-muted/5 transition-colors border-l-4 border-l-transparent hover:border-l-primary">
                                <TableCell className="pl-12 font-mono text-[10px] text-muted-foreground">{child.accountCode}</TableCell>
                                 <TableCell className="pl-12">
                                    <Link href={`/dashboard/admin/chart-of-accounts/${child.accountId}`} className="hover:underline text-sm font-medium">
                                        {child.accountName}
                                    </Link>
                                </TableCell>
                                <TableCell className="text-[9px] font-bold text-muted-foreground uppercase">{child.accountType}</TableCell>
                                <TableCell className="text-right font-bold font-mono text-xs">₵{child.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                 <TableCell className="text-right pr-6">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10" onClick={() => handleAttemptDelete(child)}>
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </React.Fragment>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center">
                            <div className="flex flex-col items-center justify-center opacity-30">
                                <ShieldCheck className="h-12 w-12 mb-2" />
                                <p className="text-sm font-medium">Registry initialized for {user.hospitalId}. Add your first account.</p>
                            </div>
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
    {accountToDelete && (
        <DeleteConfirmationDialog 
            isOpen={!!accountToDelete}
            onOpenChange={() => setAccountToDelete(null)}
            onConfirm={handleConfirmDelete}
            itemName={`account ${accountToDelete.accountName} (${accountToDelete.accountCode})`}
        />
    )}
    </>
  );
}