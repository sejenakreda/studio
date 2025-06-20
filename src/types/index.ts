
import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export type Role = 'admin' | 'guru';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  assignedMapel?: string[]; // Daftar mapel yang ditugaskan ke guru
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AppUser extends FirebaseUser {
  profile?: UserProfile;
}

export interface Siswa {
  id?: string; // Firestore document ID
  id_siswa: string; // Student's unique ID
  nama: string;
  nis: string;
  kelas: string;
}

export interface Nilai {
  id?: string; // Firestore document ID
  id_siswa: string;
  mapel: string; // Mata Pelajaran
  semester: number; // e.g., 1 or 2
  tahun_ajaran: string; // e.g., "2023/2024"
  tugas: number[];
  tes: number;
  pts: number; // Penilaian Tengah Semester
  pas: number; // Penilaian Akhir Semester
  kehadiran: number; // Stores attendance as a percentage
  eskul: number; // Extracurricular
  osis: number;
  nilai_akhir?: number; // Calculated final grade
  teacherUid?: string; // UID of the teacher who created/owns this grade entry
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Bobot {
  id?: string; // Should be a single document, e.g., "global_weights"
  tugas: number;
  tes: number;
  pts: number;
  pas: number;
  kehadiran: number; // Weight for the attendance component in final grade calculation
  eskul: number; // Max bonus points
  osis: number;  // Max bonus points
  totalHariEfektifGanjil?: number;
  totalHariEfektifGenap?: number;
}

export interface ActivityLog {
  id?: string; // Firestore document ID
  timestamp: Timestamp;
  action: string; // e.g., "Bobot diperbarui", "Guru ditambahkan"
  details?: string; // e.g., "Bobot Tugas menjadi 25%" or "Guru: Budi S."
  userId?: string; // UID of the admin performing the action
  userName?: string; // Display name of the admin
}

export type StudentTableEntry = Siswa & {
  [key: string]: any; // For dynamic grade columns if needed
  nilai_akhir_semester_1?: number;
  nilai_akhir_semester_2?: number;
};

export interface AcademicYearSetting {
  id?: string; // Firestore document ID (e.g., "2023_2024")
  year: string; // Display string (e.g., "2023/2024")
  isActive: boolean;
}

export interface KkmSetting {
  id?: string; // Firestore document ID, could be composite like mapel_tahunAjaran
  mapel: string;
  tahun_ajaran: string;
  kkmValue: number;
  updatedAt?: Timestamp;
}

export interface MataPelajaranMaster {
  id?: string; // Firestore document ID
  namaMapel: string;
  createdAt?: Timestamp;
}

export type PrioritasPengumuman = 'Tinggi' | 'Sedang' | 'Rendah';

export interface Pengumuman {
  id?: string; // Firestore document ID
  judul: string;
  isi: string;
  prioritas: PrioritasPengumuman;
  infoTambahan?: string; // e.g., "Semua Guru", "Wali Kelas XII", "Untuk Mapel Matematika"
  createdAt: Timestamp;
  createdByUid?: string;
  createdByDisplayName?: string;
}

export interface TeacherAttendance { // Rekap bulanan oleh Admin
  id?: string; // Firestore document ID (e.g., teacherUid_year_month)
  teacherUid: string;
  teacherName?: string; // For display convenience
  month: number; // 1-12
  year: number;
  daysPresent: number;
  daysAbsentWithReason: number; // Izin, Sakit
  daysAbsentWithoutReason: number; // Alpa
  totalSchoolDaysInMonth: number; // Configurable total school days in that month
  notes?: string;
  recordedByUid: string;
  recordedAt: Timestamp;
  updatedAt?: Timestamp;
}

export type TeacherDailyAttendanceStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';

export interface TeacherDailyAttendance {
  id?: string; // Composite ID: teacherUid_YYYY-MM-DD
  teacherUid: string;
  teacherName?: string; // For display, denormalized
  date: Timestamp; // The specific date of attendance
  status: TeacherDailyAttendanceStatus;
  notes?: string; // Reason for Izin/Sakit
  recordedAt: Timestamp; // When this record was created/updated
}

