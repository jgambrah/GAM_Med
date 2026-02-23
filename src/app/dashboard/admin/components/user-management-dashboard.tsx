
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
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddUserDialog } from '../../hr/components/add-user-dialog';
import { ChangeRoleDialog } from './change-role-dialog';
import { useAuth } from '@/hooks/use-auth';

export function UserManagementDashboard() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = React.useState<User[]>([]);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  // SaaS LOGIC: Always filter staff by the current hospitalId.
  React.useEffect(() => {
    if (currentUser) {
        setUsers(allUsers.filter(u => u.hospitalId === currentUser.hospitalId));
    }
  }, [currentUser]);

  const handleUserCreated = (newUser: User) => {
    setUsers(prev => [newUser, ...prev]);
  };
  
  const handleRoleChanged = (userId: string, newRole: User['role']) => {
    setUsers(prev => prev.map(u => u.uid === userId ? { ...u, role: newRole } : u));
    setSelectedUser(null);
  };

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Staff members belonging to your hospital and their assigned roles.
          </CardDescription>
        </div>
        <AddUserDialog onUserCreated={handleUserCreated} />
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'secondary' : 'outline'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {user.is_active ? 'Deactivate User' : 'Activate User'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    {selectedUser && (
        <ChangeRoleDialog
            user={selectedUser}
            onRoleChanged={handleRoleChanged}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setSelectedUser(null);
                }
            }}
        />
    )}
    </>
  );
}
