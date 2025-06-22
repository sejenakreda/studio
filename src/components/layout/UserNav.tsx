
"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { LogOut, UserCircle, Settings, LayoutDashboard } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import Link from "next/link";

export function UserNav() {
  const { user, userProfile, isAdmin, isGuru } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (!user || !userProfile) {
    return null;
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const names = name.split(" ");
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return names[0].substring(0, 2);
  };
  
  const dashboardPath = isAdmin ? "/protected/admin" : isGuru ? "/protected/guru" : "/";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-primary/50 hover:border-primary transition-colors">
            {/* Placeholder for user image if available */}
            {/* <AvatarImage src={user.photoURL || ""} alt={userProfile.displayName || "User Avatar"} /> */}
            <AvatarFallback className="bg-primary/20 text-primary font-semibold">
              {getInitials(userProfile.displayName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-foreground">
              {userProfile.displayName || "Pengguna"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {userProfile.email}
            </p>
            <p className="text-xs leading-none text-primary capitalize pt-1">
              {userProfile.role}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={dashboardPath} className="cursor-pointer">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Dasbor</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Settings className="mr-2 h-4 w-4" />
            <span>Pengaturan Akun</span>
            {/* <DropdownMenuShortcut>⌘S</DropdownMenuShortcut> */}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Keluar</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
