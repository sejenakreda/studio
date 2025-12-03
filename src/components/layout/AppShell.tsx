
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
  useSidebar,
  SidebarMenuSub,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/layout/UserNav";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Home, BookUser, Users, BarChart3, Settings, LogOut, FileText, Edit3, ShieldCheck, CalendarCog, BarChartHorizontalBig, ListChecks, BookCopy, Megaphone, CalendarCheck, UserCheck, FileClock, Building, Library, Users2, CircleDollarSign, DatabaseZap, HeartHandshake, Award, Shield, Briefcase, BookCheck, CalendarPlus, ShieldQuestion, ShieldAlert, FileWarning, ChevronDown, ArrowLeft, RefreshCw, Printer, CalendarOff, FileSignature, ClipboardCheck, Link2 } from "lucide-react"; 
import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";


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

const wakasekReportItems: NavMenuItem[] = [
  { href: "/protected/admin/kegiatan-reports?activity=kesiswaan", label: "Laporan Kesiswaan", icon: Users2 },
  { href: "/protected/admin/kegiatan-reports?activity=kurikulum", label: "Laporan Kurikulum", icon: Library },
  { href: "/protected/admin/kegiatan-reports?activity=bendahara", label: "Laporan Bendahara", icon: CircleDollarSign },
];

const pembinaReportItems: NavMenuItem[] = [
  { href: "/protected/admin/kegiatan-reports?activity=pembina_osis", label: "Laporan OSIS", icon: Award },
  { isSeparator: true },
  { href: "/protected/admin/kegiatan-reports?activity=pembina_eskul_pmr", label: "Eskul PMR", icon: Award },
  { href: "/protected/admin/kegiatan-reports?activity=pembina_eskul_paskibra", label: "Eskul Paskibra", icon: Award },
  { href: "/protected/admin/kegiatan-reports?activity=pembina_eskul_pramuka", label: "Eskul Pramuka", icon: Award },
  { href: "/protected/admin/kegiatan-reports?activity=pembina_eskul_karawitan", label: "Eskul Karawitan", icon: Award },
  { href: "/protected/admin/kegiatan-reports?activity=pembina_eskul_pencak_silat", label: "Eskul Pencak Silat", icon: Award },
  { href: "/protected/admin/kegiatan-reports?activity=pembina_eskul_volly_ball", label: "Eskul Volly Ball", icon: Award },
];

const bimbinganKonselingReportItems: NavMenuItem[] = [
  { href: "/protected/admin/kegiatan-reports?activity=bk", label: "Laporan Kegiatan BK", icon: HeartHandshake },
];

const tuAndSecurityReportItems: NavMenuItem[] = [
  { href: "/protected/admin/kegiatan-reports?activity=kepala_tata_usaha", label: "Laporan Kepala TU", icon: Briefcase },
  { href: "/protected/admin/kegiatan-reports?activity=operator", label: "Laporan Operator", icon: DatabaseZap },
  { href: "/protected/admin/kegiatan-reports?activity=staf_tu", label: "Laporan Staf TU", icon: Users },
  { isSeparator: true },
  { href: "/protected/admin/kegiatan-reports?activity=satpam", label: "Laporan Satpam", icon: ShieldQuestion },
  { href: "/protected/admin/kegiatan-reports?activity=penjaga_sekolah", label: "Laporan Penjaga Sekolah", icon: ShieldAlert },
];

const reportableRolesForTU: { id: TugasTambahan; label: string; icon: React.ElementType }[] = [
    { id: 'operator', label: 'Operator', icon: DatabaseZap },
    { id: 'staf_tu', label: 'Staf TU', icon: Users },
    { id: 'satpam', label: 'Satpam', icon: ShieldQuestion },
    { id: 'penjaga_sekolah', label: 'Penjaga Sekolah', icon: ShieldAlert },
];


const navigationStructure: NavGroup[] = [
  // --- Admin Items ---
  { 
    roles: ['admin'],
    items: [{ href: "/protected/admin", label: "Dasbor Admin", icon: Home, isExact: true }],
  },
  {
    groupLabel: "Akademik & Penilaian",
    groupIcon: BookCopy,
    roles: ['admin'],
    items: [
      { href: "/protected/admin/students", label: "Kelola Siswa", icon: BookUser },
      { href: "/protected/admin/mapel", label: "Kelola Mapel", icon: ListChecks },
      { href: "/protected/admin/kkm", label: "Atur KKM", icon: ShieldCheck },
      { href: "/protected/admin/weights", label: "Atur Bobot Nilai", icon: Settings },
      { href: "/protected/admin/academic-years", label: "Tahun Ajaran", icon: CalendarCog },
      { href: "/protected/admin/grades", label: "Semua Nilai", icon: FileText },
      { href: "/protected/admin/rekap-nilai-kosong", label: "Rekap Nilai Kosong", icon: FileWarning },
    ],
  },
  {
    groupLabel: "Manajemen Pengguna",
    groupIcon: Users,
    roles: ['admin'],
    items: [
       { href: "/protected/admin/teachers", label: "Kelola Guru", icon: Users },
    ],
  },
   {
    groupLabel: "Komunikasi",
    groupIcon: Megaphone,
    roles: ['admin'],
    items: [
      { href: "/protected/admin/announcements", label: "Pengumuman Guru", icon: Megaphone },
    ],
  },
  {
    groupLabel: "Pengaturan Umum",
    groupIcon: Settings,
    roles: ['admin'],
    items: [
      { href: "/protected/admin/school-profile", label: "Profil Sekolah", icon: Building },
      { href: "/protected/admin/holidays", label: "Kalender Libur", icon: CalendarOff },
      { href: "/protected/admin/print-settings", label: "Pengaturan Cetak", icon: Printer },
      { href: "/protected/admin/arsip-link", label: "Kelola Arsip Link", icon: Link2 },
    ],
  },
  
  // --- Guru General Items ---
  { 
    roles: ['guru'],
    requiredTugas: ({ isStafTu, isSatpam, isPenjagaSekolah }) => !isStafTu && !isSatpam && !isPenjagaSekolah,
    items: [{ href: "/protected/guru", label: "Dasbor Guru", icon: Home, isExact: true }],
  },
   // --- Administrasi Ujian (All Roles) ---
  { 
    groupLabel: "Administrasi Ujian",
    groupIcon: FileSignature,
    roles: ['admin', 'guru'],
    items: [
      { href: "/protected/administrasi-ujian/berita-acara", label: "Berita Acara", icon: FileSignature },
      { href: "/protected/administrasi-ujian/daftar-hadir", label: "Daftar Hadir Pengawas", icon: ClipboardCheck },
    ],
  },
  {
    groupLabel: "Informasi Sekolah",
    groupIcon: Building,
    roles: ['guru'],
    items: [
      { href: "/protected/guru/school-profile", label: "Profil Sekolah", icon: Building },
      { href: "/protected/arsip-link", label: "Arsip Link", icon: Link2 },
    ],
  },
  {
    groupLabel: "Komunikasi",
    groupIcon: Megaphone,
    roles: ['guru'],
    items: [{ href: "/protected/guru/announcements", label: "Pengumuman", icon: Megaphone }],
  },
  {
    groupLabel: "Akademik",
    groupIcon: Edit3,
    roles: ['guru'],
    requiredTugas: ({ isStafTu, isSatpam, isPenjagaSekolah }) => !isStafTu && !isSatpam && !isPenjagaSekolah,
    items: [
      { href: "/protected/guru/students", label: "Daftar Siswa", icon: BookUser },
      { href: "/protected/guru/grades", label: "Input Nilai", icon: Edit3 },
      { href: "/protected/guru/agenda-kelas", label: "Agenda Kelas", icon: CalendarPlus },
      { href: "/protected/guru/rekap-nilai", label: "Rekap Nilai", icon: BarChartHorizontalBig },
    ],
  },
  {
    groupLabel: "Kehadiran Saya",
    groupIcon: UserCheck,
    roles: ['guru'],
    items: [
      { href: "/protected/guru/attendance", label: "Catat Kehadiran Harian", icon: UserCheck },
      { href: "/protected/guru/rekap-kehadiran-saya", label: "Rekap Kehadiran Saya", icon: FileClock },
    ],
  },
  
  // --- Guru Special Role Dashboards ---
  {
    groupLabel: "Kurikulum",
    groupIcon: Library,
    roles: ['guru'],
    requiredTugas: ({ isKurikulum }) => isKurikulum,
    items: [
      { href: "/protected/guru/kurikulum", label: "Dasbor Kurikulum", icon: Home },
      { href: "/protected/guru/laporan-kegiatan?context=kurikulum", label: "Laporan Kegiatan", icon: BookCheck },
    ],
  },
  {
    groupLabel: "Kesiswaan",
    groupIcon: Users2,
    roles: ['guru'],
    requiredTugas: ({ isKesiswaan }) => isKesiswaan,
    items: [
      { href: "/protected/guru/kesiswaan", label: "Dasbor Kesiswaan", icon: Home },
      { href: "/protected/guru/pelanggaran-siswa", label: "Catat Pelanggaran", icon: ShieldAlert },
      { href: "/protected/guru/laporan-kegiatan?context=kesiswaan", label: "Laporan Kegiatan", icon: BookCheck },
    ],
  },
  {
    groupLabel: "Keuangan",
    groupIcon: CircleDollarSign,
    roles: ['guru'],
    requiredTugas: ({ isBendahara }) => isBendahara,
    items: [
      { href: "/protected/guru/bendahara", label: "Dasbor Keuangan", icon: Home },
      { href: "/protected/guru/laporan-kegiatan?context=keuangan", label: "Laporan Kegiatan", icon: BookCheck },
    ],
  },
  {
    groupLabel: "Manajemen Pembina",
    groupIcon: Award,
    roles: ['guru'],
    requiredTugas: ({ isPembinaOsis, isPembinaEskul }) => isPembinaOsis || isPembinaEskul,
    items: [
       { href: "/protected/guru/pembina", label: "Dasbor Pembina", icon: Home },
       { href: "/protected/guru/laporan-kegiatan?context=pembina", label: "Laporan Kegiatan", icon: BookCheck },
    ],
  },
  {
    groupLabel: "Bimbingan Konseling",
    groupIcon: HeartHandshake,
    roles: ['guru'],
    requiredTugas: ({ isBk }) => isBk,
    items: [
      { href: "/protected/guru/bk", label: "Dasbor BK", icon: Home },
      { href: "/protected/guru/pelanggaran-siswa", label: "Catat Pelanggaran", icon: ShieldAlert },
      { href: "/protected/guru/laporan-kegiatan?context=bk", label: "Laporan Kegiatan", icon: BookCheck },
    ],
  },
  {
    groupLabel: "Tata Usaha",
    groupIcon: Briefcase,
    roles: ['guru'],
    requiredTugas: ({ isKepalaTataUsaha }) => isKepalaTataUsaha,
    items: [
      { href: "/protected/guru/tata-usaha", label: "Dasbor TU", icon: Home },
    ],
  },
  {
    groupLabel: "Operator",
    groupIcon: DatabaseZap,
    roles: ['guru'],
    requiredTugas: ({ isOperator }) => isOperator,
    items: [
      { href: "/protected/guru/operator", label: "Dasbor Operator", icon: Home },
      { href: "/protected/guru/laporan-kegiatan?context=operator", label: "Laporan Kegiatan", icon: BookCheck },
    ],
  },
   {
    groupLabel: "Staf Tata Usaha",
    groupIcon: Users,
    roles: ['guru'],
    requiredTugas: ({ isStafTu }) => isStafTu,
    items: [
       { href: "/protected/guru/laporan-kegiatan?context=staf_tu", label: "Laporan Kegiatan", icon: BookCheck },
    ],
  },
  {
    groupLabel: "Satpam",
    groupIcon: ShieldQuestion,
    roles: ['guru'],
    requiredTugas: ({ isSatpam }) => isSatpam,
    items: [
       { href: "/protected/guru/laporan-kegiatan?context=satpam", label: "Laporan Kegiatan", icon: BookCheck },
    ],
  },
   {
    groupLabel: "Penjaga Sekolah",
    groupIcon: ShieldAlert,
    roles: ['guru'],
    requiredTugas: ({ isPenjagaSekolah }) => isPenjagaSekolah,
    items: [
       { href: "/protected/guru/laporan-kegiatan?context=penjaga_sekolah", label: "Laporan Kegiatan", icon: BookCheck },
    ],
  },

  // --- REPORTING GROUPS (for Admin & Kepsek) ---
  {
    groupLabel: "Laporan Umum",
    groupIcon: BarChart3,
    roles: ['admin', 'guru'],
    requiredTugas: ({ isKepalaSekolah, isAdmin }) => isKepalaSekolah || isAdmin,
    items: [
      { href: "/protected/admin/reports", label: "Statistik Sistem", icon: BarChart3 },
      { href: "/protected/admin/agenda-kelas", label: "Agenda Mengajar Guru", icon: BookCheck },
      { href: "/protected/admin/teacher-attendance", label: "Kehadiran Guru", icon: CalendarCheck },
      { href: "/protected/admin/violation-reports", label: "Laporan Pelanggaran", icon: FileWarning },
    ],
  },
  {
    groupLabel: "Laporan Wakasek",
    groupIcon: Users,
    roles: ['admin', 'guru'],
    requiredTugas: ({ isKepalaSekolah, isAdmin }) => isKepalaSekolah || isAdmin,
    items: wakasekReportItems,
  },
  {
    groupLabel: "Laporan Pembina",
    groupIcon: Award,
    roles: ['admin', 'guru'],
    requiredTugas: ({ isKepalaSekolah, isAdmin }) => isKepalaSekolah || isAdmin,
    items: pembinaReportItems,
  },
  {
    groupLabel: "Laporan Bimbingan Konseling",
    groupIcon: HeartHandshake,
    roles: ['admin', 'guru'],
    requiredTugas: ({ isKepalaSekolah, isAdmin }) => isKepalaSekolah || isAdmin,
    items: bimbinganKonselingReportItems,
  },
  {
    groupLabel: "Laporan Tata Usaha & Staf",
    groupIcon: Briefcase,
    roles: ['admin', 'guru'],
    requiredTugas: ({ isKepalaSekolah, isAdmin, isKepalaTataUsaha }) => isKepalaSekolah || isAdmin || isKepalaTataUsaha,
    items: tuAndSecurityReportItems,
  },
];


function BottomNavBar() {
    const router = useRouter();
    const { userProfile } = useAuth();
    const dashboardPath = userProfile?.role === 'admin' ? '/protected/admin' : '/protected/guru';

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-card border-t border-border shadow-md print:hidden">
            <div className="flex justify-around items-center h-16">
                <Button variant="ghost" className="flex flex-col h-full justify-center rounded-none" onClick={() => router.back()}>
                    <ArrowLeft className="h-6 w-6" />
                    <span className="text-xs">Kembali</span>
                </Button>
                <Button variant="ghost" className="flex flex-col h-full justify-center rounded-none" onClick={() => router.push(dashboardPath)}>
                    <Home className="h-6 w-6" />
                    <span className="text-xs">Beranda</span>
                </Button>
                <Button variant="ghost" className="flex flex-col h-full justify-center rounded-none" onClick={() => router.refresh()}>
                    <RefreshCw className="h-6 w-6" />
                    <span className="text-xs">Segarkan</span>
                </Button>
            </div>
        </div>
    );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authContext = useAuth();
  const { userProfile, loading } = authContext;
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();


  const handleLogout = async () => {
    if (isMobile) setOpenMobile(false);
    await signOut(auth);
    router.push("/login");
  };
  
 const filteredNavGroups = React.useMemo(() => {
    if (loading || !userProfile) return [];

    return navigationStructure.filter(group => {
        if (!group.roles.includes(userProfile.role)) {
            return false;
        }
        if (group.requiredTugas) {
            return group.requiredTugas(authContext);
        }
        return true;
    });
}, [userProfile, loading, authContext]);

  const checkIsActive = React.useCallback((item: NavMenuItem) => {
    if (!item.href) return false;
    
    // Exact match for dashboard
    if (item.isExact) {
      return pathname === item.href;
    }
    
    // For other items, check if the current path starts with the item's href
    return pathname.startsWith(item.href);

  }, [pathname]);

  const defaultOpenAccordionItems = React.useMemo(() => {
    if (loading || !userProfile) return [];

    return filteredNavGroups
      .filter(group => group.groupLabel && group.items.some(item => checkIsActive(item)))
      .map(group => group.groupLabel!);
  }, [filteredNavGroups, loading, userProfile, checkIsActive]);


  const currentPageLabel = React.useMemo(() => {
    if (loading || !userProfile) return "Memuat...";

    const allNavItemsFlat = filteredNavGroups.flatMap(group => group.items).filter(item => item.href);
    
    let bestMatch: NavMenuItem | null = null;
    
    for (const item of allNavItemsFlat) {
        if (checkIsActive(item)) {
            if (!bestMatch || item.href!.length > bestMatch.href!.length) {
                bestMatch = item;
            }
        }
    }
    
    // Fallback if no specific route is matched (e.g. on a nested, non-menu page)
    if (!bestMatch) {
       for (const item of allNavItemsFlat) {
          if (item.href && pathname.startsWith(item.href)) {
             if (!bestMatch || item.href!.length > bestMatch.href!.length) {
                bestMatch = item;
            }
          }
       }
    }

    return bestMatch ? bestMatch.label : (userProfile.role === 'admin' ? 'Dasbor Admin' : 'Dasbor Guru');
  }, [checkIsActive, filteredNavGroups, userProfile, loading, pathname]);


  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar variant="sidebar" collapsible="icon" side="left" className="border-r print:hidden">
        <SidebarHeader className="p-4 border-b">
          <Link 
            href={userProfile?.role === 'admin' ? '/protected/admin' : '/protected/guru'} 
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
                  {groupIndex > 0 && !group.groupLabel && !filteredNavGroups[groupIndex-1].groupLabel && <SidebarSeparator className="my-1"/>}
                  
                  {!group.groupLabel ? (
                    group.items.map((item) => (
                      item.isSeparator ? <SidebarSeparator key={`sep-item-${groupIndex}`} className="my-1"/> :
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
                          "flex w-full items-center justify-between gap-2 rounded-md p-2 text-left text-sm hover:no-underline hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                          "group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
                        )}
                      >
                         <div className="flex items-center gap-2">
                          {group.groupIcon && <group.groupIcon className="h-5 w-5" />}
                          <span className="flex-1 group-data-[collapsible=icon]:hidden">{group.groupLabel}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-0">
                        <SidebarMenuSub>
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
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                           })}
                        </SidebarMenuSub>
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
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6 shadow-sm print:hidden">
          <div className="flex items-center gap-4">
             <SidebarTrigger className="md:hidden" />
             <h1 className="text-lg font-semibold text-foreground font-headline">
              {currentPageLabel}
            </h1>
          </div>
          <UserNav />
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background overflow-auto pb-20 md:pb-8">
            {children}
        </main>
        <BottomNavBar />
      </div>
    </div>
  );
}
