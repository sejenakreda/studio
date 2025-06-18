import type { User as FirebaseUser } from 'firebase/auth';

export type Role = 'admin' | 'guru';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role;
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

export type StudentTableEntry = Siswa & {
  [key: string]: any; // For dynamic grade columns if needed
  nilai_akhir_semester_1?: number;
  nilai_akhir_semester_2?: number;
};
