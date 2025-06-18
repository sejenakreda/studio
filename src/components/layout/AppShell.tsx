
"use client";

import *
as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarFooter,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/layout/UserNav";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Home, BookUser, Users, BarChart3, Settings, LogOut, FileText, Edit3, ShieldCheck, CalendarCog, BarChartHorizontalBig, ListChecks, BookCopy, Megaphone } from "lucide-react"; 
import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { getAllPengumuman } from "@/lib/firestoreService"; 
import type { Pengumuman } from "@/types";
import { Timestamp } from "firebase/firestore";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Array<'admin' | 'guru'>;
}

const navItems: NavItem[] = [
  { href: "/admin", label: "Dasbor Admin", icon: Home, roles: ['admin'] },
  { href: "/admin/teachers", label: "Kelola Guru", icon: Users, roles: ['admin'] },
  { href: "/admin/mapel", label: "Kelola Mapel", icon: ListChecks, roles: ['admin'] },
  { href: "/admin/announcements", label: "Pengumuman", icon: Megaphone, roles: ['admin'] },
  { href: "/admin/weights", label: "Atur Bobot", icon: Settings, roles: ['admin'] },
  { href: "/admin/academic-years", label: "Tahun Ajaran", icon: CalendarCog, roles: ['admin'] },
  { href: "/admin/grades", label: "Semua Nilai", icon: FileText, roles: ['admin'] },
  { href: "/admin/reports", label: "Laporan Sistem", icon: BarChart3, roles: ['admin'] },
  { href: "/guru", label: "Dasbor Guru", icon: Home, roles: ['guru'] },
  { href: "/guru/announcements", label: "Pengumuman", icon: Megaphone, roles: ['guru'] },
  { href: "/guru/students", label: "Kelola Siswa", icon: BookUser, roles: ['guru'] },
  { href: "/guru/grades", label: "Input Nilai", icon: Edit3, roles: ['guru'] },
  { href: "/guru/rekap-nilai", label: "Rekap Nilai", icon: BarChartHorizontalBig, roles: ['guru'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const [announcementBadgeCount, setAnnouncementBadgeCount] = React.useState<number>(0);
  const [isLoadingBadge, setIsLoadingBadge] = React.useState(false);

  React.useEffect(() => {
    if (userProfile?.role === 'guru' && userProfile.uid) {
      setIsLoadingBadge(true);
      const lastSeenKey = `lastSeenAnnouncementTimestamp_${userProfile.uid}`;

      const updateBadgeLogic = async () => {
        try {
          const allFetchedAnnouncements = await getAllPengumuman(); 

          if (pathname === '/guru/announcements') {
            if (allFetchedAnnouncements.length > 0 && allFetchedAnnouncements[0].createdAt) {
              const newestTimestamp = allFetchedAnnouncements[0].createdAt.toMillis();
              localStorage.setItem(lastSeenKey, newestTimestamp.toString());
            } else {
              localStorage.setItem(lastSeenKey, Timestamp.now().toMillis().toString());
            }
            setAnnouncementBadgeCount(0); 
          } else {
            const storedLastSeen = localStorage.getItem(lastSeenKey);
            const lastSeenTimestamp = storedLastSeen ? parseInt(storedLastSeen, 10) : 0;

            if (allFetchedAnnouncements.length > 0) {
              const unreadAnnouncements = allFetchedAnnouncements.filter(
                (ann) => ann.createdAt && ann.createdAt.toMillis() > lastSeenTimestamp
              );
              setAnnouncementBadgeCount(unreadAnnouncements.length);
            } else {
              setAnnouncementBadgeCount(0);
            }
          }
        } catch (error) {
          console.error("Error updating announcement badge:", error);
          setAnnouncementBadgeCount(0); 
        } finally {
          setIsLoadingBadge(false);
        }
      };

      updateBadgeLogic();
    } else {
      setAnnouncementBadgeCount(0);
      if(userProfile?.uid) { 
        localStorage.removeItem(`lastSeenAnnouncementTimestamp_${userProfile.uid}`);
      }
      setIsLoadingBadge(false);
    }
  }, [userProfile, pathname]);


  const handleLogout = async () => {
    if (userProfile?.uid) {
       // Optional: Clear lastSeen timestamp on logout if desired, though not strictly necessary
       // localStorage.removeItem(`lastSeenAnnouncementTimestamp_${userProfile.uid}`);
    }
    await signOut(auth);
    router.push("/login");
  };

  const filteredNavItems = React.useMemo(() => {
    if (loading || !userProfile) return [];
    return navItems.filter(item => item.roles.includes(userProfile.role));
  }, [userProfile, loading]);

  // Determine the correct current page label for the header
  const currentPageLabel = React.useMemo(() => {
    const currentTopLevelPath = `/${pathname.split('/')[1]}`; // e.g., /admin or /guru
    const defaultDashboardLabel = userProfile?.role === 'admin' ? 'Dasbor Admin' : (userProfile?.role === 'guru' ? 'Dasbor Guru' : 'Dasbor');
    
    // Find a direct match or a prefix match for nested routes
    let foundLabel = defaultDashboardLabel;
    let longestMatchLength = currentTopLevelPath.length;

    for (const item of filteredNavItems) {
      if (item.href === pathname) { // Exact match
        foundLabel = item.label;
        break; 
      }
      // Check for prefix match for nested routes, but ensure it's more specific than just /admin or /guru
      if (pathname.startsWith(item.href) && item.href.length > longestMatchLength) {
        if (item.href === currentTopLevelPath && pathname !== currentTopLevelPath) {
          // If item.href is /admin and pathname is /admin/something, we need a more specific label if available
          // This case is tricky. We look for a more specific match first.
          // Example: if on /admin/teachers/edit/xyz, we want "Kelola Guru" not "Dasbor Admin"
        } else {
            // A more specific path like /admin/teachers matched /admin/teachers/edit/xyz
            foundLabel = item.label;
            longestMatchLength = item.href.length;
        }
      }
    }
    // Special handling for root dashboard if no more specific label found from nested paths
    if (pathname === "/admin" && userProfile?.role === 'admin') foundLabel = "Dasbor Admin";
    if (pathname === "/guru" && userProfile?.role === 'guru') foundLabel = "Dasbor Guru";
    
    return foundLabel;
  }, [pathname, filteredNavItems, userProfile]);


  return (
    <div className="flex min-h-screen w-full">
      <Sidebar variant="sidebar" collapsible="icon" side="left" className="border-r">
        <SidebarHeader className="p-4 border-b">
          <Link href={userProfile?.role === 'admin' ? '/admin' : '/guru'} className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <BookCopy className="h-8 w-8 text-primary transition-transform duration-300 group-hover/sidebar:rotate-[10deg]" />
            <span id="sidebar-mobile-title" className="font-bold text-xl text-primary group-data-[collapsible=icon]:hidden font-headline">SiAP Smapna</span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="flex-1 p-2">
          <ScrollArea className="h-full">
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || (item.href !== (userProfile?.role === 'admin' ? '/admin' : '/guru') && pathname.startsWith(item.href) && item.href.length > (userProfile?.role === 'admin' ? '/admin'.length : '/guru'.length) )}
                    tooltip={{ children: item.label, side: "right", align: "center" }}
                  >
                    <Link href={item.href} className="relative">
                      <item.icon className="h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      {item.href === "/guru/announcements" && announcementBadgeCount > 0 && !isLoadingBadge && (
                        <SidebarMenuBadge 
                           className="absolute top-1 right-1 h-5 min-w-[20px] px-1.5 flex items-center justify-center text-xs group-data-[collapsible=icon]:top-0 group-data-[collapsible=icon]:right-0 group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:min-w-[16px] group-data-[collapsible=icon]:px-1 bg-destructive text-destructive-foreground"
                        >
                          {announcementBadgeCount}
                        </SidebarMenuBadge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter className="p-2 border-t">
          <SidebarMenuButton
              onClick={handleLogout}
              tooltip={{ children: "Keluar", side: "right", align: "center" }}
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">Keluar</span>
            </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>

      <div className="flex flex-col flex-1">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6 shadow-sm">
          <div className="flex items-center gap-4">
             <SidebarTrigger className="md:hidden" />
             <h1 className="text-lg font-semibold text-foreground font-headline">
              {currentPageLabel}
            </h1>
          </div>
          <UserNav />
        </header>
        <SidebarInset>
            <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background overflow-auto">
                {children}
            </main>
        </SidebarInset>
      </div>
    </div>
  );
}
    