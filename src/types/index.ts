
import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export type Role = 'admin' | 'guru';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role;
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
  eskul: number;
  osis: number;
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
