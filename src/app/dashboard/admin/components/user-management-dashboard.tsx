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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { allUsers } from '@/lib/data';
import { User } from '@/lib/types';
import { MoreHorizontal, UserSearch, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddUserDialog } from '../../hr/components/add-user-dialog';
import { ChangeRoleDialog } from './change-role-dialog';
import { ChangeEmailDialog } from './change-email-dialog';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import Link from 'next/link';

export function UserManagementDashboard() {
  const { user: currentUser } = useAuth();
  const firestore = useFirestore();
  const [selectedUserForRole, setSelectedUserForRole] = React.useState<User | null>(null);
  const [selectedUserForEmail, setSelectedUserForEmail] = React.useState<User | null>(null);

  // LIVE QUERY: Fetch actual staff from Firestore for this facility
  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !currentUser?.hospitalId) return null;
    return query(collection(firestore, "users"), where("hospitalId", "==", currentUser.hospitalId));
  }, [firestore, currentUser?.hospitalId]);

  const { data: staff, isLoading } = useCollection<User>(staffQuery);

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between bg-muted/10 border-b">
        <div>
          <CardTitle className="text-lg">User Management</CardTitle>
          <CardDescription>
            Manage staff credentials and access levels for <strong>{currentUser?.hospitalId}</strong>.
          </CardDescription>
        </div>
        <AddUserDialog onUserCreated={() => {}} existingUsers={staff || []} />
      </CardHeader>
      <CardContent className="pt-6">
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : staff && staff.length > 0 ? staff.map((member) => (
                <TableRow key={member.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-bold text-slate-900">{member.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{member.email}</TableCell>
                  <TableCell className="capitalize text-xs font-semibold">{member.role.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <Badge variant={member.is_active ? 'secondary' : 'outline'} className="text-[10px] uppercase font-black">
                      {member.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel className="text-[10px] uppercase font-black opacity-40">Staff Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/hr/staff/${member.id}`} className="cursor-pointer">
                            <UserSearch className="mr-2 h-4 w-4" /> View Full Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSelectedUserForRole(member)} className="cursor-pointer">
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSelectedUserForEmail(member)} className="cursor-pointer">
                          Update Email/ID
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                    No staff records found for your facility.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    {selectedUserForRole && (
        <ChangeRoleDialog
            user={selectedUserForRole}
            onRoleChanged={() => {}}
            onOpenChange={(isOpen) => !isOpen && setSelectedUserForRole(null)}
        />
    )}
    {selectedUserForEmail && (
        <ChangeEmailDialog 
            user={selectedUserForEmail}
            onEmailChanged={() => {}}
            onOpenChange={(isOpen) => !isOpen && setSelectedUserForEmail(null)}
        />
    )}
    </>
  );
}
