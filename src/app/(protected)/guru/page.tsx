
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookUser, Edit3, BarChart2, Users } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext"; 

export default function GuruDashboardPage() {
  const { userProfile } = useAuth();

  const quickStats = [
    { title: "Total Siswa Anda", value: "32", icon: Users, color: "text-blue-500", bgColor: "bg-blue-100", href: "/guru/students" },
    { title: "Kelas Diajar", value: "X IPA 1, XI IPS 2", icon: BookUser, color: "text-green-500", bgColor: "bg-green-100", href: "/guru/students?filter=kelas" },
    { title: "Nilai Perlu Diinput", value: "5 Siswa", icon: Edit3, color: "text-red-500", bgColor: "bg-red-100", href: "/guru/grades" },
    { title: "Rata-rata Kelas", value: "82.5", icon: BarChart2, color: "text-purple-500", bgColor: "bg-purple-100", href: "#" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Dasbor Guru</h1>
          <p className="text-muted-foreground">Selamat datang kembali, {userProfile?.displayName || "Guru"}!</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat) => (
          <Link 
            href={stat.href} 
            key={stat.title} 
            className="block hover:shadow-lg transition-shadow duration-300 rounded-lg"
          >
            <Card className="overflow-hidden h-full flex flex-col">
              <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${stat.bgColor}`}>
                <CardTitle className={`text-sm font-medium ${stat.color}`}>{stat.title}</CardTitle>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-center">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                 <p className="text-xs text-muted-foreground pt-1">
                  Lihat Detail
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tugas Terbaru</CardTitle>
            <CardDescription>Daftar tugas atau pengumuman penting.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                { task: "Input nilai PTS Semester Ganjil paling lambat 25 Okt", class: "Semua Kelas", urgency: "Tinggi" },
                { task: "Rapat koordinasi wali kelas", class: "Khusus Wali Kelas", urgency: "Sedang" },
                { task: "Pengumpulan RPP terbaru", class: "Semua Guru", urgency: "Rendah" },
              ].map((item, idx) => (
                <li key={idx} className="flex items-start space-x-3 p-3 rounded-md border hover:bg-accent/50">
                  <Edit3 className={`h-5 w-5 mt-0.5 ${item.urgency === 'Tinggi' ? 'text-red-500' : item.urgency === 'Sedang' ? 'text-yellow-500' : 'text-green-500'}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.task}</p>
                    <p className="text-xs text-muted-foreground">{item.class} - Prioritas: {item.urgency}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pintasan Menu Guru</CardTitle>
            <CardDescription>Akses cepat ke fitur yang sering digunakan.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/guru/students">
              <Button variant="outline" className="w-full justify-start gap-2 py-6 text-base hover:bg-primary/10 hover:border-primary hover:text-primary">
                <BookUser className="h-6 w-6" /> Kelola Data Siswa
              </Button>
            </Link>
            <Link href="/guru/grades">
              <Button variant="outline" className="w-full justify-start gap-2 py-6 text-base hover:bg-primary/10 hover:border-primary hover:text-primary">
                <Edit3 className="h-6 w-6" /> Input & Lihat Nilai
              </Button>
            </Link>
            <Button variant="outline" className="w-full justify-start gap-2 py-6 text-base hover:bg-primary/10 hover:border-primary hover:text-primary" disabled>
              <BarChart2 className="h-6 w-6" /> Analisis Nilai Kelas
            </Button>
             <Button variant="outline" className="w-full justify-start gap-2 py-6 text-base hover:bg-primary/10 hover:border-primary hover:text-primary" disabled>
              <Users className="h-6 w-6" /> Daftar Kehadiran
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
