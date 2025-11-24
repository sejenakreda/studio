import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export type Role = 'admin' | 'guru';

export type TugasTambahan = 
  | 'kesiswaan' 
  | 'kurikulum' 
  | 'pembina_osis' 
  | 'kepala_sekolah'
  | 'operator'
  | 'bendahara'
  | 'bk'
  | 'kepala_tata_usaha'
  | 'staf_tu'
  | 'satpam'
  | 'penjaga_sekolah'
  | 'pembina_eskul_pmr'
  | 'pembina_eskul_paskibra'
  | 'pembina_eskul_pramuka'
  | 'pembina_eskul_karawitan'
  | 'pembina_eskul_pencak_silat'
  | 'pembina_eskul_volly_ball';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  fcmToken?: string;
  assignedMapel?: string[]; // Daftar mapel yang ditugaskan ke guru
  tugasTambahan?: TugasTambahan[]; // Daftar tugas tambahan guru
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
  kegiatan?: TugasTambahan[];
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
  eskul: number;
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

export interface StudentTableEntry extends Siswa {
  [key: string]: any; // For dynamic grade columns if needed
  nilai_akhir_semester_1?: number;
  nilai_akhir_semester_2?: number;
}

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

export type TeacherDailyAttendanceStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';

export interface TeacherDailyAttendance {
  id?: string; // Composite ID: teacherUid_YYYY-MM-DD
  teacherUid: string;
  teacherName?: string;
  date: Timestamp;
  status: TeacherDailyAttendanceStatus;
  notes?: string;
  recordedAt: Timestamp; // First time this daily record was created
  updatedAt?: Timestamp; // Last time this record was updated
  lastUpdatedByUid?: string; // UID of user who last updated (guru on initial, admin on edit)
}

export interface ClassDetail {
  className: string;
  male: { ril: number; dapodik: number };
  female: { ril: number; dapodik: number };
}

export interface SaranaDetail {
  name: string;
  quantity: number;
}

export interface SchoolStats {
    alumni: { ril: number; dapodik: number };
    guru: { ril: number; dapodik: number };
    tendik: { ril: number; dapodik: number };
}

export interface SchoolProfile {
  id?: string; // Will be a single doc, e.g. "main_profile"
  stats: SchoolStats;
  totalSiswa: number; // This will be auto-calculated from classDetails sum
  classDetails: ClassDetail[];
  sarana: SaranaDetail[];
  updatedAt?: Timestamp;
}

export interface PelanggaranSiswa {
  id?: string;
  id_siswa: string;
  namaSiswa: string;
  kelasSiswa: string;
  tanggal: Timestamp;
  pelanggaran: string;
  catatan?: string;
  poin: number;
  recordedByUid: string;
  recordedByName: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface LaporanKegiatan {
  id?: string;
  activityId: TugasTambahan; // e.g., 'pembina_osis'
  activityName: string; // e.g., 'OSIS'
  title: string;
  content: string;
  date: Timestamp;
  createdByUid: string;
  createdByDisplayName: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface AgendaKelas {
  id?: string;
  teacherUid: string;
  teacherName: string;
  kelas: string;
  mapel: string;
  tanggal: Timestamp;
  jamKe: string;
  tujuanPembelajaran: string;
  pokokBahasan: string;
  siswaAbsen: { idSiswa: string; namaSiswa: string }[];
  refleksi: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PrintSettings {
  id?: string;
  headerImageUrl?: string;
  place?: string; // e.g., "Cianjur"
  signerOneName?: string; // e.g., "Nama Kepala Sekolah"
  signerOnePosition?: string; // e.g., "Kepala Sekolah"
  signerOneNpa?: string; // NPA for signer one
  signerTwoName?: string; // e.g., "Nama Wali Kelas"
  signerTwoPosition?: string; // e.g., "Wali Kelas"
  signerTwoNpa?: string; // NPA for signer two
  updatedAt?: Timestamp;
}

export interface SchoolHoliday {
  id?: string; // Auto-generated ID from Firestore
  dateString: string; // "2024-08-17"
  description: string;
  createdAt?: Timestamp;
}

export interface BeritaAcaraUjian {
  id?: string;
  // Header
  jenisUjian: string;
  tahunPelajaran: string;
  mataUjian: string;
  // Detail Waktu & Tempat
  hari: string;
  tanggal: number;
  bulan: string;
  tahun: number;
  waktuMulai: string;
  waktuSelesai: string;
  ruangUjian: string;
  // Peserta
  jumlahPesertaX: number;
  jumlahPesertaXI: number;
  jumlahPesertaXII: number;
  pesertaHadirNomor: string;
  pesertaAbsenNomor: string;
  // Naskah
  jumlahDaftarHadir: number;
  jumlahBeritaAcara: number;
  // Catatan & Pengawas
  catatanUjian: string;
  pengawasNama: string;
  pengawasTandaTanganUrl?: string;
  // Metadata
  createdByUid: string;
  createdByDisplayName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}