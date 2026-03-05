import { Stethoscope, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from 'next/link';


type HeaderProps = {
    user: User | null;
    onLogout: () => void;
};

export function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="py-4 px-4 md:px-8 border-b border-border/50 bg-card">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-4">
            <Stethoscope className="h-8 w-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-headline font-bold text-foreground">
            GAM_Med
            </h1>
        </Link>

        {user && (
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-9 w-9">
                        <AvatarFallback>
                            <UserIcon className="h-5 w-5" />
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                    {user.displayName || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                    </p>
                </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/app-ceo/dashboard">
                        <Shield className="mr-2 h-4 w-4" />
                        <span>CEO Dashboard</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
           </DropdownMenu>
        )}
      </div>
    </header>
  );
}
