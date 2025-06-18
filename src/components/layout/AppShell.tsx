
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
  SidebarMenuBadge, // Import SidebarMenuBadge
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/layout/UserNav";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Home, BookUser, Users, BarChart3, Settings, LogOut, FileText, Edit3, ShieldCheck, CalendarCog, BarChartHorizontalBig, ListChecks, BookCopy, Megaphone } from "lucide-react"; 
import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { getPengumumanUntukGuru } from "@/lib/firestoreService"; // Import service to fetch announcements

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
  { href: "/guru/announcements", label: "Pengumuman", icon: Megaphone, roles: ['guru'] }, // New menu for guru
  { href: "/guru/students", label: "Kelola Siswa", icon: BookUser, roles: ['guru'] },
  { href: "/guru/grades", label: "Input Nilai", icon: Edit3, roles: ['guru'] },
  { href: "/guru/rekap-nilai", label: "Rekap Nilai", icon: BarChartHorizontalBig, roles: ['guru'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const [announcementBadgeCount, setAnnouncementBadgeCount] = React.useState<number | null>(null);
  const [isLoadingBadge, setIsLoadingBadge] = React.useState(false);

  React.useEffect(() => {
    // Fetch announcement count for guru badge
    if (userProfile?.role === 'guru' && announcementBadgeCount === null && !isLoadingBadge) {
      setIsLoadingBadge(true);
      const fetchBadgeCount = async () => {
        try {
          const announcements = await getPengumumanUntukGuru(5); // Get latest 5 for badge count
          setAnnouncementBadgeCount(announcements.length);
        } catch (error) {
          console.error("Error fetching announcement count for badge:", error);
          setAnnouncementBadgeCount(0); 
        } finally {
          setIsLoadingBadge(false);
        }
      };
      fetchBadgeCount();
    } else if (userProfile?.role !== 'guru') {
      setAnnouncementBadgeCount(null); // Reset if not guru or profile changes
    }
  // Add announcementBadgeCount to dependency array if you want it to reset and refetch if it becomes null again for some reason
  // For now, it fetches once when role is guru and count is null.
  }, [userProfile, isLoadingBadge, announcementBadgeCount]);


  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const filteredNavItems = React.useMemo(() => {
    if (loading || !userProfile) return [];
    return navItems.filter(item => item.roles.includes(userProfile.role));
  }, [userProfile, loading]);

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
                    isActive={pathname === item.href || (item.href !== (userProfile?.role === 'admin' ? '/admin' : '/guru') && pathname.startsWith(item.href))}
                    tooltip={{ children: item.label, side: "right", align: "center" }}
                  >
                    <Link href={item.href} className="relative"> {/* Added relative for badge positioning */}
                      <item.icon className="h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      {item.href === "/guru/announcements" && announcementBadgeCount !== null && announcementBadgeCount > 0 && (
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
              {filteredNavItems.find(item => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/')) || (item.href === (userProfile?.role === 'admin' ? '/admin' : '/guru') && pathname === item.href))?.label || 
               (userProfile?.role === 'admin' ? 'Dasbor Admin' : userProfile?.role === 'guru' ? 'Dasbor Guru' : 'Dasbor')}
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
