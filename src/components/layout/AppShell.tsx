
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuItem,
  SidebarMenu,
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
import { Home, BookUser, Users, BarChart3, Settings, LogOut, FileText, Edit3, ShieldCheck, CalendarCog, BarChartHorizontalBig, ListChecks, BookCopy, Megaphone, CalendarCheck, UserCheck, FileClock, Building, Library, Users2, CircleDollarSign, DatabaseZap, HeartHandshake, Award, Shield, Briefcase, BookCheck, CalendarPlus, ShieldQuestion, ShieldAlert } from "lucide-react"; 
import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { getAllPengumuman } from "@/lib/firestoreService"; 
import type { Pengumuman, TugasTambahan } from "@/types";
import { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";


interface NavMenuItem {
  href?: string;
  label?: string;
  icon?: React.ElementType;
  isExact?: boolean;
  isSeparator?: boolean;
}

interface NavGroup {
  groupLabel?: string; 
  groupIcon?: React.ElementType;
  items: NavMenuItem[];
  roles: Array<'admin' | 'guru'>; 
  requiredTugas?: (authContext: ReturnType<typeof useAuth>) => boolean;
}

const reportableRoles: { id: TugasTambahan; label: string; icon: React.ElementType }[] = [
    { id: 'pembina_osis', label: 'OSIS', icon: Award },
    { id: 'pembina_eskul_pmr', label: 'Eskul PMR', icon: Award },
    { id: 'pembina_eskul_paskibra', label: 'Eskul Paskibra', icon: Award },
    { id: 'pembina_eskul_pramuka', label: 'Eskul Pramuka', icon: Award },
    { id: 'pembina_eskul_karawitan', label: 'Eskul Karawitan', icon: Award },
    { id: 'pembina_eskul_pencak_silat', label: 'Eskul Pencak Silat', icon: Award },
    { id: 'pembina_eskul_volly_ball', label: 'Eskul Volly Ball', icon: Award },
    { id: 'bk', label: 'Bimbingan Konseling', icon: HeartHandshake },
    { id: 'operator', label: 'Operator', icon: DatabaseZap },
    { id: 'kepala_tata_usaha', label: 'Tata Usaha', icon: Briefcase },
    { id: 'staf_tu', label: 'Staf TU', icon: Users },
    { id: 'satpam', label: 'Satpam', icon: ShieldQuestion },
    { id: 'penjaga_sekolah', label: 'Penjaga Sekolah', icon: ShieldCheck },
];

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
      { href: "/admin/agenda-kelas", label: "Laporan Agenda Kelas", icon: BookCheck },
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
    groupLabel: "Komunikasi",
    groupIcon: Megaphone,
    roles: ['admin'],
    items: [
      { href: "/admin/announcements", label: "Pengumuman Guru", icon: Megaphone },
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
    requiredTugas: ({ isStafTu, isSatpam, isPenjagaSekolah }) => !isStafTu && !isSatpam && !isPenjagaSekolah,
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
    requiredTugas: ({ isStafTu, isSatpam, isPenjagaSekolah }) => !isStafTu && !isSatpam && !isPenjagaSekolah,
    items: [
      { href: "/guru/students", label: "Daftar Siswa", icon: BookUser },
      { href: "/guru/grades", label: "Input Nilai", icon: Edit3 },
      { href: "/guru/agenda-kelas", label: "Agenda Kelas", icon: CalendarPlus },
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
    groupLabel: "Laporan & Fungsi Khusus",
    groupIcon: Shield,
    roles: ['admin'],
    requiredTugas: ({ isKepalaSekolah, isAdmin }) => isKepalaSekolah || isAdmin,
    items: [
      { href: "/admin/reports", label: "Laporan Sistem", icon: BarChart3 },
      { href: "/admin/violation-reports", label: "Laporan Kesiswaan", icon: Users2 },
      ...reportableRoles.map(role => ({
        href: `/admin/kegiatan-reports?activity=${role.id}`,
        label: `Laporan ${role.label}`,
        icon: role.icon,
        isExact: false, 
      }))
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
    groupLabel: "Tata Usaha",
    groupIcon: Briefcase,
    roles: ['guru'],
    requiredTugas: ({ isKepalaTataUsaha }) => isKepalaTataUsaha,
    items: [
      { href: "/guru/tata-usaha", label: "Dasbor Saya", icon: Home },
      { isSeparator: true },
      ...reportableRoles
        .filter(role => ['operator', 'staf_tu', 'satpam', 'penjaga_sekolah'].includes(role.id))
        .map(role => ({
            href: `/admin/kegiatan-reports?activity=${role.id}`,
            label: `Laporan ${role.label}`,
            icon: role.icon,
            isExact: false,
        }))
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
   {
    groupLabel: "Staf Tata Usaha",
    groupIcon: Users,
    roles: ['guru'],
    requiredTugas: ({ isStafTu }) => isStafTu,
    items: [
       { href: "/guru/staf-tu", label: "Laporan Staf TU", icon: Home },
    ],
  },
  {
    groupLabel: "Satpam",
    groupIcon: ShieldQuestion,
    roles: ['guru'],
    requiredTugas: ({ isSatpam }) => isSatpam,
    items: [
       { href: "/guru/satpam", label: "Laporan Satpam", icon: Home },
    ],
  },
   {
    groupLabel: "Penjaga Sekolah",
    groupIcon: ShieldAlert,
    roles: ['guru'],
    requiredTugas: ({ isPenjagaSekolah }) => isPenjagaSekolah,
    items: [
       { href: "/guru/penjaga-sekolah", label: "Laporan Penjaga", icon: Home },
    ],
  },
];


export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
        // Must match user role
        if (!group.roles.includes(userProfile.role)) {
            return false;
        }
        // If there's a requiredTugas check, it must pass
        if (group.requiredTugas) {
            return group.requiredTugas(authContext);
        }
        // If no requiredTugas check, it's valid for the role
        return true;
    });
}, [userProfile, loading, authContext]);


  const defaultOpenAccordionItems = React.useMemo(() => {
    if (loading || !userProfile) return [];

    return filteredNavGroups
      .filter(group => group.groupLabel && group.items.some(item => {
          if (!item.href) return false;
          const itemPath = item.href.split('?')[0];
          return pathname.startsWith(itemPath);
      }))
      .map(group => group.groupLabel!);
  }, [pathname, filteredNavGroups, loading, userProfile]);


  const currentPageLabel = React.useMemo(() => {
    if (loading || !userProfile) return "Memuat...";

    const allNavItemsFlat = filteredNavGroups.flatMap(group => group.items).filter(item => item.href);
    
    let bestMatch: NavMenuItem | null = null;
    
    for (const item of allNavItemsFlat) {
        if (!item.href) continue;
        const itemPath = item.href.split('?')[0];

        if (pathname === itemPath) {
            const itemParams = new URLSearchParams(item.href.split('?')[1] || '');
            const currentParams = new URLSearchParams(searchParams.toString());
            let paramsMatch = true;
            if (itemParams.size > currentParams.size) { 
                paramsMatch = false;
            } else {
                for (const [key, value] of itemParams.entries()) {
                    if (currentParams.get(key) !== value) {
                        paramsMatch = false;
                        break;
                    }
                }
            }
            if (paramsMatch) {
                bestMatch = item;
                break;
            }
        }

        if (pathname.startsWith(itemPath)) {
            if (!bestMatch || item.href.length > bestMatch!.href!.length) {
                bestMatch = item;
            }
        }
    }

    return bestMatch ? bestMatch.label : (userProfile.role === 'admin' ? 'Dasbor Admin' : 'Dasbor Guru');
  }, [pathname, searchParams, filteredNavGroups, userProfile, loading]);


  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  const checkIsActive = React.useCallback((item: NavMenuItem) => {
    if (!item.href) return false;
    const currentPath = pathname;
    const itemPath = item.href.split('?')[0];

    if (item.isExact) {
      return currentPath === itemPath;
    }

    if (!currentPath.startsWith(itemPath)) {
      return false;
    }

    const itemParams = new URLSearchParams(item.href.split('?')[1] || '');
    const currentParams = new URLSearchParams(searchParams.toString());

    if (Array.from(itemParams.keys()).length === 0) {
      return true;
    }

    for (const [key, value] of itemParams.entries()) {
      if (currentParams.get(key) !== value) {
        return false;
      }
    }
    
    return true;

  }, [pathname, searchParams]);


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
            <Accordion type="multiple" className="w-full" defaultValue={defaultOpenAccordionItems} key={JSON.stringify(defaultOpenAccordionItems)}>
              {filteredNavGroups.map((group, groupIndex) => (
                <React.Fragment key={group.groupLabel || group.items[0]?.href || groupIndex}>
                  {groupIndex > 0 && (!group.groupLabel || !filteredNavGroups[groupIndex-1].groupLabel) && <SidebarSeparator className="my-1"/>}
                  
                  {!group.groupLabel ? (
                    group.items.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={checkIsActive(item)}
                          tooltip={{ children: item.label, side: "right", align: "center" }}
                          onClick={handleLinkClick}
                        >
                          <Link href={item.href!} className="relative">
                            {item.icon && <item.icon className="h-5 w-5" />}
                            <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))
                  ) : (
                    <AccordionItem value={group.groupLabel} className="border-b-0">
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
                          {group.items.map((item, itemIndex) => {
                            if (item.isSeparator) {
                              return <SidebarSeparator key={`sep-${group.groupLabel}-${itemIndex}`} className="my-1 mx-0" />;
                            }
                            return (
                              <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton
                                  asChild
                                  isActive={checkIsActive(item)}
                                  size="sm" 
                                  className="h-7"
                                  onClick={handleLinkClick}
                                >
                                  <Link href={item.href!} className="relative">
                                    {item.icon && <item.icon className="h-4 w-4" />}
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
                            );
                           })}
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
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background overflow-auto">
            {children}
        </main>
      </div>
    </div>
  );
}
