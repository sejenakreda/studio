
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
  SidebarSeparator, // Ditambahkan untuk memisahkan grup
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/layout/UserNav";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Home, BookUser, Users, BarChart3, Settings, LogOut, FileText, Edit3, ShieldCheck, CalendarCog, BarChartHorizontalBig, ListChecks, BookCopy, Megaphone, CalendarCheck } from "lucide-react"; 
import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { getAllPengumuman } from "@/lib/firestoreService"; 
import type { Pengumuman } from "@/types";
import { Timestamp } from "firebase/firestore";

// Definisikan tipe baru untuk item menu dan grup
interface NavMenuItem {
  href: string;
  label: string;
  icon: React.ElementType;
  isExact?: boolean;
}

interface NavGroup {
  groupLabel?: string; // Label untuk grup, opsional
  items: NavMenuItem[];
  roles: Array<'admin' | 'guru'>; // Peran yang dapat melihat grup ini
}

// Struktur navigasi baru yang dikelompokkan
const navigationStructure: NavGroup[] = [
  // --- Admin Items ---
  { // Dasbor Admin (tanpa label grup eksplisit, akan muncul pertama)
    roles: ['admin'],
    items: [{ href: "/admin", label: "Dasbor Admin", icon: Home, isExact: true }],
  },
  {
    groupLabel: "Akademik & Penilaian",
    roles: ['admin'],
    items: [
      { href: "/admin/students", label: "Kelola Siswa", icon: BookUser },
      { href: "/admin/mapel", label: "Kelola Mapel", icon: ListChecks },
      { href: "/admin/weights", label: "Atur Bobot Nilai", icon: Settings },
      { href: "/admin/academic-years", label: "Tahun Ajaran", icon: CalendarCog },
      { href: "/admin/grades", label: "Semua Nilai", icon: FileText },
    ],
  },
  {
    groupLabel: "Manajemen Pengguna",
    roles: ['admin'],
    items: [
       { href: "/admin/teachers", label: "Kelola Guru", icon: Users },
    ],
  },
   {
    groupLabel: "Kehadiran",
    roles: ['admin'],
    items: [
       { href: "/admin/teacher-attendance", label: "Kehadiran Guru", icon: CalendarCheck },
    ]
  },
  {
    groupLabel: "Komunikasi & Laporan",
    roles: ['admin'],
    items: [
      { href: "/admin/announcements", label: "Pengumuman Guru", icon: Megaphone },
      { href: "/admin/reports", label: "Laporan Sistem", icon: BarChart3 },
    ],
  },

  // --- Guru Items ---
  { // Dasbor Guru (tanpa label grup eksplisit)
    roles: ['guru'],
    items: [{ href: "/guru", label: "Dasbor Guru", icon: Home, isExact: true }],
  },
  {
    groupLabel: "Informasi",
    roles: ['guru'],
    items: [{ href: "/guru/announcements", label: "Pengumuman", icon: Megaphone }],
  },
  {
    groupLabel: "Akademik Guru",
    roles: ['guru'],
    items: [
      { href: "/guru/students", label: "Daftar Siswa", icon: BookUser },
      { href: "/guru/grades", label: "Input Nilai", icon: Edit3 },
      { href: "/guru/rekap-nilai", label: "Rekap Nilai", icon: BarChartHorizontalBig },
    ],
  },
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
    await signOut(auth);
    router.push("/login");
  };

  const filteredNavGroups = React.useMemo(() => {
    if (loading || !userProfile) return [];
    return navigationStructure.filter(group => group.roles.includes(userProfile.role));
  }, [userProfile, loading]);

  const currentPageLabel = React.useMemo(() => {
    if (loading || !userProfile) return "Memuat...";

    const defaultDashboardLabel = userProfile.role === 'admin' ? 'Dasbor Admin' : 'Dasbor Guru';
    
    const allNavItemsFlat = filteredNavGroups.flatMap(group => group.items);

    const exactMatch = allNavItemsFlat.find(item => item.href === pathname);
    if (exactMatch) {
      return exactMatch.label;
    }

    let bestMatch: NavMenuItem | null = null;
    for (const item of allNavItemsFlat) {
      if (item.isExact) continue; 
      if (pathname.startsWith(item.href)) {
        if (!bestMatch || item.href.length > bestMatch.href.length) {
          bestMatch = item;
        }
      }
    }
    
    return bestMatch ? bestMatch.label : defaultDashboardLabel;
  }, [pathname, filteredNavGroups, userProfile, loading]);


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
              {filteredNavGroups.map((group, groupIndex) => (
                <React.Fragment key={`group-${group.groupLabel || 'main'}-${groupIndex}`}>
                  {group.groupLabel && (
                    <>
                      {/* Tambahkan separator hanya jika ini bukan grup pertama DAN grup ini memiliki label */}
                      {groupIndex > 0 && <SidebarSeparator className="my-2" />}
                      <div className="px-3 pt-2 pb-1 text-xs font-medium text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
                        {group.groupLabel}
                      </div>
                    </>
                  )}
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={item.isExact ? pathname === item.href : pathname.startsWith(item.href)}
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
                </React.Fragment>
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
    
