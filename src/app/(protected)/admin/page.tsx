"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, Settings, FileText, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const stats = [
    { title: "Total Guru", value: "12", icon: Users, color: "text-blue-500", bgColor: "bg-blue-100", href: "/admin/teachers" },
    { title: "Bobot Penilaian", value: "Dikonfigurasi", icon: Settings, color: "text-green-500", bgColor: "bg-green-100", href: "/admin/weights" },
    { title: "Total Siswa (Global)", value: "350", icon: FileText, color: "text-purple-500", bgColor: "bg-purple-100", href: "/admin/grades" },
    { title: "Aktivitas Terbaru", value: "Update Bobot", icon: ShieldAlert, color: "text-yellow-500", bgColor: "bg-yellow-100", href: "#" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Dasbor Admin</h1>
          <p className="text-muted-foreground">Ringkasan dan manajemen sistem SkorZen.</p>
        </div>
        {/* Optional: Add a primary action button here, e.g., "Tambah Guru Baru" */}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link href={stat.href} key={stat.title} legacyBehavior>
            <a className="block hover:shadow-lg transition-shadow duration-300 rounded-lg">
              <Card className="overflow-hidden h-full flex flex-col">
                <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${stat.bgColor}`}>
                  <CardTitle className={`text-sm font-medium ${stat.color}`}>{stat.title}</CardTitle>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-center">
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <p className="text-xs text-muted-foreground pt-1">
                    {/* Placeholder for additional info, e.g. "+20.1% from last month" */}
                    Lihat Detail
                  </p>
                </CardContent>
              </Card>
            </a>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terkini</CardTitle>
            <CardDescription>Log perubahan penting dalam sistem.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                { action: "Bobot 'Tugas' diubah menjadi 25%", user: "Admin Test", time: "2 jam lalu" },
                { action: "Guru 'Budi Sudarsono' ditambahkan", user: "Admin Test", time: "1 hari lalu" },
                { action: "Sistem backup berhasil", user: "Sistem", time: "3 hari lalu" },
              ].map((item, idx) => (
                <li key={idx} className="flex items-start space-x-3">
                  <BarChart3 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.user} - {item.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pintasan Cepat</CardTitle>
            <CardDescription>Akses cepat ke fitur utama admin.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Link href="/admin/teachers" passHref legacyBehavior>
              <Button variant="outline" className="w-full justify-start gap-2 hover:bg-accent hover:text-accent-foreground">
                <Users className="h-5 w-5" /> Kelola Guru
              </Button>
            </Link>
            <Link href="/admin/weights" passHref legacyBehavior>
              <Button variant="outline" className="w-full justify-start gap-2 hover:bg-accent hover:text-accent-foreground">
                <Settings className="h-5 w-5" /> Atur Bobot
              </Button>
            </Link>
            <Link href="/admin/grades" passHref legacyBehavior>
              <Button variant="outline" className="w-full justify-start gap-2 hover:bg-accent hover:text-accent-foreground">
                <FileText className="h-5 w-5" /> Lihat Semua Nilai
              </Button>
            </Link>
            <Button variant="outline" className="w-full justify-start gap-2 hover:bg-accent hover:text-accent-foreground" disabled>
              <ShieldAlert className="h-5 w-5" /> Laporan Sistem
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
