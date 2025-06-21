"use client";

import
* as React from "react";
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
  SidebarSeparator, 
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/layout/UserNav";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Home, BookUser, Users, BarChart3, Settings, LogOut, FileText, Edit3, ShieldCheck, CalendarCog, BarChartHorizontalBig, ListChecks, BookCopy, Megaphone, CalendarCheck, UserCheck, FileClock, Building, Library, Users2, CircleDollarSign, DatabaseZap, HeartHandshake, Award, Shield, FileWarning } from "lucide-react"; 
import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { getAllPengumuman } from "@/lib/firestoreService"; 
import type { Pengumuman } from "@/types";
import { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";


interface NavMenuItem {
  href: string;
  label: string;
  icon: React.ElementType;
  isExact?: boolean;
}

interface NavGroup {
  groupLabel?: string; 
  groupIcon?: React.ElementType;
  items: NavMenuItem[];
  roles: Array<'admin' | 'guru'>; 
  requiredTugas?: (authContext: ReturnType<typeof useAuth>) => boolean;
}


const navigationStructure: NavGroup[] = [
  // --- Admin Items ---
  { 
    roles: ['admin'],
    items: [{ href: "/admin", label: "Dasbor Admin", icon: Home, isExact: true }],
  },
  {
    groupLabel: "Akademik & Penilaian",
    groupIcon: BookCopy,
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
    groupIcon: Users,
    roles: ['admin'],
    items: [
       { href: "/admin/teachers", label: "Kelola Guru", icon: Users },
    ],
  },
   {
    groupLabel: "Kehadiran Guru",
    groupIcon: CalendarCheck,
    roles: ['admin'],
    items: [
       { href: "/admin/teacher-attendance", label: "Kelola Rekap Kehadiran", icon: CalendarCheck },
    ]
  },
  {
    groupLabel: "Komunikasi & Laporan",
    groupIcon: Megaphone,
    roles: ['admin'],
    items: [
      { href: "/admin/announcements", label: "Pengumuman Guru", icon: Megaphone },
      { href: "/admin/reports", label: "Laporan Sistem", icon: BarChart3 },
      { href: "/admin/violation-reports", label: "Laporan Pelanggaran", icon: FileWarning },
    ],
  },
  {
    groupLabel: "Pengaturan Umum",
    groupIcon: Settings,
    roles: ['admin'],
    items: [
      { href: "/admin/school-profile", label: "Profil Sekolah", icon: Building },
    ],
  },

  // --- Guru Items ---
  { 
    roles: ['guru'],
    items: [{ href: "/guru", label: "Dasbor Guru", icon: Home, isExact: true }],
  },
  {
    groupLabel: "Informasi Sekolah",
    groupIcon: Building,
    roles: ['guru'],
    items: [
      { href: "/guru/school-profile", label: "Profil Sekolah", icon: Building }
    ],
  },
  {
    groupLabel: "Komunikasi",
    groupIcon: Megaphone,
    roles: ['guru'],
    items: [{ href: "/guru/announcements", label: "Pengumuman", icon: Megaphone }],
  },
  {
    groupLabel: "Akademik",
    groupIcon: Edit3,
    roles: ['guru'],
    items: [
      { href: "/guru/students", label: "Daftar Siswa", icon: BookUser },
      { href: "/guru/grades", label: "Input Nilai", icon: Edit3 },
      { href: "/guru/rekap-nilai", label: "Rekap Nilai", icon: BarChartHorizontalBig },
    ],
  },
  {
    groupLabel: "Kehadiran Saya",
    groupIcon: UserCheck,
    roles: ['guru'],
    items: [
      { href: "/guru/attendance", label: "Catat Kehadiran Harian", icon: UserCheck },
      { href: "/guru/rekap-kehadiran-saya", label: "Rekap Kehadiran Saya", icon: FileClock },
    ],
  },
  // --- GURU - TUGAS TAMBAHAN (ordered by likely importance/power) ---
  {
    groupLabel: "Kepala Sekolah",
    groupIcon: Shield,
    roles: ['guru'],
    requiredTugas: ({ isKepalaSekolah }) => isKepalaSekolah,
    items: [
      { href: "/admin/reports", label: "Laporan Sistem", icon: BarChart3 },
      { href: "/admin/grades", label: "Semua Nilai Siswa", icon: FileText },
      { href: "/admin/violation-reports", label: "Laporan Pelanggaran", icon: FileWarning },
    ],
  },
  {
    groupLabel: "Kurikulum",
    groupIcon: Library,
    roles: ['guru'],
    requiredTugas: ({ isKurikulum }) => isKurikulum,
    items: [
      { href: "/guru/kurikulum", label: "Dasbor Kurikulum", icon: Home },
    ],
  },
  {
    groupLabel: "Kesiswaan",
    groupIcon: Users2,
    roles: ['guru'],
    requiredTugas: ({ isKesiswaan }) => isKesiswaan,
    items: [
      { href: "/guru/kesiswaan", label: "Dasbor Kesiswaan", icon: Home },
    ],
  },
  {
    groupLabel: "Keuangan",
    groupIcon: CircleDollarSign,
    roles: ['guru'],
    requiredTugas: ({ isBendahara }) => isBendahara,
    items: [
      { href: "/guru/bendahara", label: "Dasbor Keuangan", icon: Home },
    ],
  },
  {
    groupLabel: "Operator",
    groupIcon: DatabaseZap,
    roles: ['guru'],
    requiredTugas: ({ isOperator }) => isOperator,
    items: [
      { href: "/guru/operator", label: "Dasbor Operator", icon: Home },
    ],
  },
  {
    groupLabel: "Bimbingan Konseling",
    groupIcon: HeartHandshake,
    roles: ['guru'],
    requiredTugas: ({ isBk }) => isBk,
    items: [
      { href: "/guru/bk", label: "Dasbor BK", icon: Home },
    ],
  },
  {
    groupLabel: "Manajemen Pembina",
    groupIcon: Award,
    roles: ['guru'],
    requiredTugas: ({ isPembinaOsis, isPembinaEskul }) => isPembinaOsis || isPembinaEskul,
    items: [
       { href: "/guru/pembina", label: "Dasbor Pembina", icon: Home },
    ],
  },
];


export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const authContext = useAuth();
  const { userProfile, loading } = authContext;
  const router = useRouter();
  const [announcementBadgeCount, setAnnouncementBadgeCount] = React.useState<number>(0);
  const [isLoadingBadge, setIsLoadingBadge] = React.useState(false);
  const { isMobile, setOpenMobile } = useSidebar();

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
    if (isMobile) setOpenMobile(false);
    await signOut(auth);
    router.push("/login");
  };

  const filteredNavGroups = React.useMemo(() => {
    if (loading || !userProfile) return [];
    return navigationStructure.filter(group => {
      if (!group.roles.includes(userProfile.role)) return false;
      if (group.requiredTugas) {
        return group.requiredTugas(authContext);
      }
      return true;
    });
  }, [userProfile, loading, authContext]);

  const defaultOpenAccordionItems = React.useMemo(() => {
    if (loading || !userProfile) return [];
    return filteredNavGroups
      .filter(group => group.groupLabel && group.items.some(item =>
        item.isExact ? pathname === item.href : pathname.startsWith(item.href)
      ))
      .map(group => group.groupLabel!);
  }, [pathname, filteredNavGroups, loading, userProfile]);


  const currentPageLabel = React.useMemo(() => {
    if (loading || !userProfile) return "Memuat...";
    const defaultDashboardLabel = userProfile.role === 'admin' ? 'Dasbor Admin' : 'Dasbor Guru';
    const allNavItemsFlat = filteredNavGroups.flatMap(group => group.items);
    const exactMatch = allNavItemsFlat.find(item => item.href === pathname);
    if (exactMatch) return exactMatch.label;
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

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar variant="sidebar" collapsible="icon" side="left" className="border-r">
        <SidebarHeader className="p-4 border-b">
          <Link 
            href={userProfile?.role === 'admin' ? '/admin' : '/guru'} 
            className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center"
            onClick={handleLinkClick}
          >
            <BookCopy className="h-8 w-8 text-primary transition-transform duration-300 group-hover/sidebar:rotate-[10deg]" />
            <span id="sidebar-mobile-title" className="font-bold text-xl text-primary group-data-[collapsible=icon]:hidden font-headline">SiAP Smapna</span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="flex-1 p-2">
          <ScrollArea className="h-full">
            <Accordion type="multiple" className="w-full" defaultValue={defaultOpenAccordionItems}>
              {filteredNavGroups.map((group, groupIndex) => (
                <React.Fragment key={`navgroup-${group.groupLabel || group.items[0]?.href || groupIndex}`}>
                  {groupIndex > 0 && (!group.groupLabel || !filteredNavGroups[groupIndex-1].groupLabel) && <SidebarSeparator className="my-1"/>}
                  
                  {!group.groupLabel ? (
                    group.items.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={item.isExact ? pathname === item.href : pathname.startsWith(item.href)}
                          tooltip={{ children: item.label, side: "right", align: "center" }}
                          onClick={handleLinkClick}
                        >
                          <Link href={item.href} className="relative">
                            <item.icon className="h-5 w-5" />
                            <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))
                  ) : (
                    <AccordionItem value={group.groupLabel!} className="border-b-0">
                      <AccordionTrigger 
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                          "group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
                        )}
                      >
                        {group.groupIcon && <group.groupIcon className="h-5 w-5 group-data-[collapsible=icon]:h-5 group-data-[collapsible=icon]:w-5" />}
                        <span className="flex-1 group-data-[collapsible=icon]:hidden">{group.groupLabel}</span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <SidebarMenu className="ml-4 mt-1 border-l border-sidebar-border pl-3 group-data-[collapsible=icon]:hidden">
                          {group.items.map((item) => (
                            <SidebarMenuItem key={item.href}>
                              <SidebarMenuButton
                                asChild
                                isActive={item.isExact ? pathname === item.href : pathname.startsWith(item.href)}
                                size="sm" 
                                className="h-7"
                                onClick={handleLinkClick}
                              >
                                <Link href={item.href} className="relative">
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.label}</span>
                                  {item.href === "/guru/announcements" && announcementBadgeCount > 0 && !isLoadingBadge && (
                                    <SidebarMenuBadge 
                                      className="absolute top-1 right-1 h-4 min-w-[16px] px-1 flex items-center justify-center text-xs"
                                    >
                                      {announcementBadgeCount}
                                    </SidebarMenuBadge>
                                  )}
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </React.Fragment>
              ))}
            </Accordion>
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
