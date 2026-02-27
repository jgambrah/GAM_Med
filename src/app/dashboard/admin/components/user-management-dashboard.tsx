
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
import { MoreHorizontal, UserSearch } from 'lucide-react';
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
import Link from 'next/link';

export function UserManagementDashboard() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = React.useState<User[]>([]);
  const [selectedUserForRole, setSelectedUserForRole] = React.useState<User | null>(null);
  const [selectedUserForEmail, setSelectedUserForEmail] = React.useState<User | null>(null);

  // SaaS LOGIC: Always filter staff by the current hospitalId.
  React.useEffect(() => {
    if (currentUser?.hospitalId) {
        setUsers(allUsers.filter(u => u.hospitalId === currentUser.hospitalId));
    }
  }, [currentUser]);

  const handleUserCreated = (newUser: User) => {
    setUsers(prev => [newUser, ...prev]);
  };
  
  const handleRoleChanged = (userId: string, newRole: User['role']) => {
    setUsers(prev => prev.map(u => u.uid === userId ? { ...u, role: newRole } : u));
    setSelectedUserForRole(null);
  };

  const handleEmailChanged = (oldId: string, newUser: User) => {
    setUsers(prev => {
        const filtered = prev.filter(u => u.uid !== oldId);
        return [newUser, ...filtered];
    });
    setSelectedUserForEmail(null);
  }

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
        <AddUserDialog onUserCreated={handleUserCreated} existingUsers={users} />
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
              {users.length > 0 ? users.map((user) => (
                <TableRow key={user.uid} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-bold text-slate-900">{user.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="capitalize text-xs font-semibold">{user.role.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'secondary' : 'outline'} className="text-[10px] uppercase font-black">
                      {user.is_active ? 'Active' : 'Inactive'}
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
                          <Link href={`/dashboard/hr/staff/${user.uid}`} className="cursor-pointer">
                            <UserSearch className="mr-2 h-4 w-4" /> View Full Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSelectedUserForRole(user)} className="cursor-pointer">
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSelectedUserForEmail(user)} className="cursor-pointer">
                          Update Email/ID
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive cursor-pointer">
                          {user.is_active ? 'Revoke Access' : 'Restore Access'}
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
            onRoleChanged={handleRoleChanged}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setSelectedUserForRole(null);
                }
            }}
        />
    )}
    {selectedUserForEmail && (
        <ChangeEmailDialog 
            user={selectedUserForEmail}
            onEmailChanged={handleEmailChanged}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setSelectedUserForEmail(null);
                }
            }}
        />
    )}
    </>
  );
}
