import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  writeBatch,
  Timestamp,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
  SnapshotOptions,
  FirestoreDataConverter,
  orderBy,
  limit,
  arrayRemove,
  arrayUnion,
  Query,
  QueryConstraint,
  QuerySnapshot,
  FirestoreError
} from 'firebase/firestore';
import { db } from './firebase';
import type { 
  Bobot, Siswa, Nilai, UserProfile, Role, ActivityLog, 
  AcademicYearSetting, KkmSetting, MataPelajaranMaster, 
  Pengumuman, TeacherDailyAttendance, SchoolProfile, 
  PelanggaranSiswa, LaporanKegiatan, AgendaKelas, 
  PrintSettings, SchoolHoliday, BeritaAcaraUjian, 
  DaftarHadirPengawas, ArsipLinkCategory 
} from '@/types';
import { User } from 'firebase/auth';
import { getCurrentAcademicYear } from './utils';

// --- Generic Error Handler ---
const handleFirestoreError = (error: any, operation: string, collectionName: string): never => {
  console.error(`Firestore Error during ${operation} on ${collectionName}:`, error);
  let userMessage = `Gagal ${operation} data di '${collectionName}'.`;
  if (error instanceof FirestoreError) {
    if (error.code === 'permission-denied') {
      userMessage = `Error Izin: Anda tidak memiliki hak untuk ${operation} data di '${collectionName}'.`;
    } else if (error.code === 'unauthenticated') {
      userMessage = `Error Autentikasi: Anda harus login untuk ${operation} data.`;
    } else {
      userMessage = `Terjadi error Firestore (${error.code}) saat ${operation}.`;
    }
  }
  throw new Error(userMessage);
};

// --- Converters ---

const arsipLinkCategoryConverter: FirestoreDataConverter<ArsipLinkCategory> = {
  toFirestore(category: Omit<ArsipLinkCategory, 'id'>): DocumentData {
    return {
      title: category.title,
      description: category.description,
      links: category.links || [],
      order: category.order ?? 0,
      createdAt: category.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ArsipLinkCategory {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      title: data.title,
      description: data.description,
      links: data.links || [],
      order: data.order ?? 0,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};

// --- Arsip Link Service ---
const ARSIP_LINK_CATEGORY_COLLECTION = 'arsipLinkCategories';

export const addArsipCategory = async (data: Omit<ArsipLinkCategory, 'id' | 'createdAt' | 'updatedAt' | 'links' | 'order'>): Promise<ArsipLinkCategory> => {
  try {
    const collRef = collection(db, ARSIP_LINK_CATEGORY_COLLECTION).withConverter(arsipLinkCategoryConverter);
    
    // Get highest order to set new category at the end
    const snapshot = await getDocs(collRef);
    const lastOrder = snapshot.empty ? 0 : Math.max(...snapshot.docs.map(d => d.data().order || 0));
    
    const dataToSave = { 
      ...data, 
      links: [], 
      order: lastOrder + 1,
      createdAt: serverTimestamp() as Timestamp, 
      updatedAt: serverTimestamp() as Timestamp 
    };
    const docRef = await addDoc(collRef, dataToSave);
    return { id: docRef.id, ...dataToSave, links: [] };
  } catch (error) {
    handleFirestoreError(error, 'menambah', ARSIP_LINK_CATEGORY_COLLECTION);
  }
};

export const getArsipCategories = async (): Promise<ArsipLinkCategory[]> => {
  try {
    const collRef = collection(db, ARSIP_LINK_CATEGORY_COLLECTION).withConverter(arsipLinkCategoryConverter);
    // CRITICAL FIX: Fetch all first to include legacy data without 'order' field
    const querySnapshot = await getDocs(collRef);
    const data = querySnapshot.docs.map(doc => doc.data());
    
    // Sort in memory to be resilient to missing 'order' fields
    return data.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    handleFirestoreError(error, 'mendapatkan', ARSIP_LINK_CATEGORY_COLLECTION);
  }
};

export const updateArsipCategory = async (id: string, data: Partial<Omit<ArsipLinkCategory, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, ARSIP_LINK_CATEGORY_COLLECTION, id);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, 'memperbarui', ARSIP_LINK_CATEGORY_COLLECTION);
  }
};

export const deleteArsipCategory = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, ARSIP_LINK_CATEGORY_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, 'menghapus', ARSIP_LINK_CATEGORY_COLLECTION);
  }
};

export const reorderArsipCategories = async (categories: ArsipLinkCategory[]): Promise<void> => {
  try {
    const batch = writeBatch(db);
    categories.forEach((cat, index) => {
      if (cat.id) {
        const docRef = doc(db, ARSIP_LINK_CATEGORY_COLLECTION, cat.id);
        batch.update(docRef, { order: index + 1, updatedAt: serverTimestamp() });
      }
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, 'mengurutkan', ARSIP_LINK_CATEGORY_COLLECTION);
  }
};

// --- Holiday Service ---
export const getSchoolHolidays = async (startDate: Date, endDate: Date): Promise<SchoolHoliday[]> => {
  try {
    const fromStr = startDate.toISOString().split('T')[0];
    const toStr = endDate.toISOString().split('T')[0];
    const q = query(
      collection(db, 'schoolHolidays'),
      where('dateString', '>=', fromStr),
      where('dateString', '<=', toStr)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolHoliday));
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return [];
  }
};

export const getSchoolHolidaysForMonth = async (year: number, month: number): Promise<SchoolHoliday[]> => {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0, 23, 59, 59);
  return await getSchoolHolidays(from, to);
};

export const setSchoolHoliday = async (holiday: Omit<SchoolHoliday, 'id' | 'createdAt'>) => {
  try {
    const docRef = doc(db, 'schoolHolidays', holiday.dateString);
    await setDoc(docRef, { ...holiday, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, 'menambah', 'schoolHolidays');
  }
};

export const deleteSchoolHoliday = async (dateString: string) => {
  try {
    const docRef = doc(db, 'schoolHolidays', dateString);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, 'menghapus', 'schoolHolidays');
  }
};

// --- Other Services (Placeholders or partially implemented) ---

export const getStudents = async (): Promise<Siswa[]> => {
  try {
    const q = query(collection(db, 'siswa'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Siswa));
  } catch (e) { return []; }
};

export const getStudentById = async (id: string) => {
  try {
    const d = await getDoc(doc(db, 'siswa', id));
    return d.exists() ? { id: d.id, ...d.data() } as Siswa : null;
  } catch (e) { return null; }
};

export const addStudent = async (s: Omit<Siswa, 'id'>) => addDoc(collection(db, 'siswa'), s);
export const updateStudent = async (id: string, data: Partial<Siswa>) => updateDoc(doc(db, 'siswa', id), data);
export const deleteStudent = async (id: string) => deleteDoc(doc(db, 'siswa', id));

export const getFilteredGrades = async (filters: any): Promise<Nilai[]> => {
  try {
    let q = query(collection(db, 'nilai'));
    if (filters.tahunAjaran) q = query(q, where('tahun_ajaran', '==', filters.tahunAjaran));
    if (filters.semester) q = query(q, where('semester', '==', filters.semester));
    if (filters.mapel && filters.mapel.length > 0) q = query(q, where('mapel', 'in', filters.mapel));
    const snap = await getDocs(q);
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Nilai));
    if (filters.studentIds) {
      results = results.filter(r => filters.studentIds.includes(r.id_siswa));
    }
    return results;
  } catch (e) { return []; }
};

export const getActiveAcademicYears = async (): Promise<string[]> => {
  try {
    const q = query(collection(db, 'academicYearConfigs'), where('isActive', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data().year);
  } catch (e) { return []; }
};

export const getMataPelajaranMaster = async (): Promise<MataPelajaranMaster[]> => {
  try {
    const snap = await getDocs(collection(db, 'mataPelajaranMaster'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MataPelajaranMaster));
  } catch (e) { return []; }
};

export const addMataPelajaranMaster = async (namaMapel: string) => {
  return addDoc(collection(db, 'mataPelajaranMaster'), { namaMapel, createdAt: serverTimestamp() });
};

export const deleteMataPelajaranMaster = async (id: string) => deleteDoc(doc(db, 'mataPelajaranMaster', id));

export const getWeights = async (): Promise<Bobot | null> => {
  try {
    const d = await getDoc(doc(db, 'bobot', 'global_weights'));
    return d.exists() ? { id: d.id, ...d.data() } as Bobot : null;
  } catch (e) { return null; }
};

export const updateWeights = async (data: Bobot) => setDoc(doc(db, 'bobot', 'global_weights'), data);

export const getSchoolProfile = async (): Promise<SchoolProfile | null> => {
  try {
    const d = await getDoc(doc(db, 'schoolConfig', 'main_profile'));
    return d.exists() ? { id: d.id, ...d.data() } as SchoolProfile : null;
  } catch (e) { return null; }
};

export const updateSchoolProfile = async (data: SchoolProfile) => setDoc(doc(db, 'schoolConfig', 'main_profile'), data);

export const getPrintSettings = async (): Promise<PrintSettings | null> => {
  try {
    const d = await getDoc(doc(db, 'schoolConfig', 'print_settings'));
    return d.exists() ? { id: d.id, ...d.data() } as PrintSettings : null;
  } catch (e) { return null; }
};

export const updatePrintSettings = async (data: any) => setDoc(doc(db, 'schoolConfig', 'print_settings'), { ...data, updatedAt: serverTimestamp() });

export const addActivityLog = async (action: string, details: string, userId: string, userName: string) => {
  return addDoc(collection(db, 'activity_logs'), { action, details, userId, userName, timestamp: serverTimestamp() });
};

export const getAllPengumuman = async (): Promise<Pengumuman[]> => {
  try {
    const q = query(collection(db, 'pengumuman'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Pengumuman));
  } catch (e) { return []; }
};

export const addPengumuman = async (data: any) => addDoc(collection(db, 'pengumuman'), { ...data, createdAt: serverTimestamp() });
export const deletePengumuman = async (id: string) => deleteDoc(doc(db, 'pengumuman', id));

export const getAllPelanggaran = async (year: number, month: number | null): Promise<PelanggaranSiswa[]> => {
  try {
    let q = query(collection(db, 'pelanggaran_siswa'), orderBy('tanggal', 'desc'));
    const snap = await getDocs(q);
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as PelanggaranSiswa));
    return results.filter(r => {
      const d = r.tanggal.toDate();
      return d.getFullYear() === year && (month === null || d.getMonth() === month - 1);
    });
  } catch (e) { return []; }
};

export const addPelanggaran = async (data: any) => addDoc(collection(db, 'pelanggaran_siswa'), { ...data, createdAt: serverTimestamp() });

export const getAllLaporanKegiatan = async (): Promise<LaporanKegiatan[]> => {
  try {
    const q = query(collection(db, 'laporan_kegiatan'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as LaporanKegiatan));
  } catch (e) { return []; }
};

export const getLaporanKegiatanByActivity = async (activityId: string, userId: string): Promise<LaporanKegiatan[]> => {
  try {
    const q = query(collection(db, 'laporan_kegiatan'), where('activityId', '==', activityId), where('createdByUid', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as LaporanKegiatan));
  } catch (e) { return []; }
};

export const addLaporanKegiatan = async (data: any) => addDoc(collection(db, 'laporan_kegiatan'), { ...data, createdAt: serverTimestamp() });
export const updateLaporanKegiatan = async (id: string, data: any) => updateDoc(doc(db, 'laporan_kegiatan', id), { ...data, updatedAt: serverTimestamp() });
export const deleteLaporanKegiatan = async (id: string) => deleteDoc(doc(db, 'laporan_kegiatan', id));

export const getAllAgendas = async (year: number, month: number | null): Promise<AgendaKelas[]> => {
  try {
    const snap = await getDocs(collection(db, 'agenda_kelas'));
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as AgendaKelas));
    return results.filter(r => {
      const d = r.tanggal.toDate();
      return d.getFullYear() === year && (month === null || d.getMonth() === month - 1);
    });
  } catch (e) { return []; }
};

export const getAgendasForTeacher = async (userId: string, year: number, month: number): Promise<AgendaKelas[]> => {
  try {
    const q = query(collection(db, 'agenda_kelas'), where('teacherUid', '==', userId));
    const snap = await getDocs(q);
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as AgendaKelas));
    return results.filter(r => {
      const d = r.tanggal.toDate();
      return d.getFullYear() === year && d.getMonth() === month - 1;
    });
  } catch (e) { return []; }
};

export const addOrUpdateAgendaKelas = async (data: any, id?: string) => {
  if (id) return updateDoc(doc(db, 'agenda_kelas', id), { ...data, updatedAt: serverTimestamp() });
  return addDoc(collection(db, 'agenda_kelas'), { ...data, createdAt: serverTimestamp() });
};

export const deleteAgenda = async (id: string) => deleteDoc(doc(db, 'agenda_kelas', id));

export const getAllUsersByRole = async (role: Role): Promise<UserProfile[]> => {
  try {
    const q = query(collection(db, 'users'), where('role', '==', role));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
  } catch (e) { return []; }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const d = await getDoc(doc(db, 'users', uid));
    return d.exists() ? { uid: d.id, ...d.data() } as UserProfile : null;
  } catch (e) { return null; }
};

export const createUserProfile = async (user: User, role: Role, displayName: string, assignedMapel: string[] = [], tugasTambahan: TugasTambahan[] = []) => {
  const profile: Omit<UserProfile, 'uid'> = {
    email: user.email,
    displayName,
    role,
    assignedMapel,
    tugasTambahan,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  return setDoc(doc(db, 'users', user.uid), profile);
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  return updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
};

export const deleteUserRecord = async (uid: string) => deleteDoc(doc(db, 'users', uid));

export const getGradesForTeacherDisplay = async (teacherUid: string, mapel: string[], year: string, semester: number): Promise<Nilai[]> => {
  try {
    const q = query(
      collection(db, 'nilai'),
      where('teacherUid', '==', teacherUid),
      where('tahun_ajaran', '==', year),
      where('semester', '==', semester),
      where('mapel', 'in', mapel)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Nilai));
  } catch (e) { return []; }
};

export const addOrUpdateGrade = async (data: any, teacherUid: string, id?: string) => {
  if (id) return updateDoc(doc(db, 'nilai', id), { ...data, updatedAt: serverTimestamp() });
  return addDoc(collection(db, 'nilai'), { ...data, teacherUid, createdAt: serverTimestamp() });
};

export const deleteGradeById = async (id: string) => deleteDoc(doc(db, 'nilai', id));

export const getKkmSetting = async (mapel: string, year: string): Promise<KkmSetting | null> => {
  try {
    const q = query(collection(db, 'kkm_settings'), where('mapel', '==', mapel), where('tahun_ajaran', '==', year));
    const snap = await getDocs(q);
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() } as KkmSetting;
  } catch (e) { return null; }
};

export const getAllKkmSettings = async (): Promise<KkmSetting[]> => {
  try {
    const snap = await getDocs(collection(db, 'kkm_settings'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as KkmSetting));
  } catch (e) { return []; }
};

export const setKkmSetting = async (data: any) => {
  const id = `${data.mapel}_${data.tahun_ajaran}`.replace(/\//g, '_');
  return setDoc(doc(db, 'kkm_settings', id), { ...data, updatedAt: serverTimestamp() });
};

export const getTeacherDailyAttendanceForDate = async (teacherUid: string, date: Date): Promise<TeacherDailyAttendance | null> => {
  try {
    const dateStr = date.toISOString().split('T')[0];
    const id = `${teacherUid}_${dateStr}`;
    const d = await getDoc(doc(db, 'teacherDailyAttendance', id));
    return d.exists() ? { id: d.id, ...d.data() } as TeacherDailyAttendance : null;
  } catch (e) { return null; }
};

export const getTeacherDailyAttendanceForMonth = async (teacherUid: string, year: number, month: number): Promise<TeacherDailyAttendance[]> => {
  try {
    const q = query(collection(db, 'teacherDailyAttendance'), where('teacherUid', '==', teacherUid));
    const snap = await getDocs(q);
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as TeacherDailyAttendance));
    return results.filter(r => {
      const d = r.date.toDate();
      return d.getFullYear() === year && d.getMonth() === month - 1;
    });
  } catch (e) { return []; }
};

export const getAllTeachersDailyAttendanceForPeriod = async (year: number, month: number | null): Promise<TeacherDailyAttendance[]> => {
  try {
    const snap = await getDocs(collection(db, 'teacherDailyAttendance'));
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as TeacherDailyAttendance));
    return results.filter(r => {
      const d = r.date.toDate();
      return d.getFullYear() === year && (month === null || d.getMonth() === month - 1);
    });
  } catch (e) { return []; }
};

export const addOrUpdateTeacherDailyAttendance = async (data: any) => {
  const dateStr = data.date.toDate().toISOString().split('T')[0];
  const id = `${data.teacherUid}_${dateStr}`;
  const docRef = doc(db, 'teacherDailyAttendance', id);
  const snap = await getDoc(docRef);
  if (snap.exists()) return updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  return setDoc(docRef, { ...data, recordedAt: serverTimestamp() });
};

export const deleteTeacherDailyAttendance = async (id: string) => deleteDoc(doc(db, 'teacherDailyAttendance', id));

export const getUniqueMapelNamesFromGrades = async (): Promise<string[]> => {
  try {
    const snap = await getDocs(collection(db, 'nilai'));
    const names = snap.docs.map(d => d.data().mapel);
    return [...new Set(names)].sort();
  } catch (e) { return []; }
};

export const getGradesByStudentId = async (studentId: string): Promise<Nilai[]> => {
  try {
    const q = query(collection(db, 'nilai'), where('id_siswa', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Nilai));
  } catch (e) { return []; }
};

export const getBeritaAcara = async (userProfile: UserProfile): Promise<BeritaAcaraUjian[]> => {
  try {
    let q = query(collection(db, 'beritaAcaraUjian'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as BeritaAcaraUjian));
  } catch (e) { return []; }
};

export const getBeritaAcaraById = async (id: string): Promise<BeritaAcaraUjian | null> => {
  try {
    const d = await getDoc(doc(db, 'beritaAcaraUjian', id));
    return d.exists() ? { id: d.id, ...d.data() } as BeritaAcaraUjian : null;
  } catch (e) { return null; }
};

export const addBeritaAcara = async (data: any) => addDoc(collection(db, 'beritaAcaraUjian'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
export const updateBeritaAcara = async (id: string, data: any) => updateDoc(doc(db, 'beritaAcaraUjian', id), { ...data, updatedAt: serverTimestamp() });
export const deleteBeritaAcara = async (id: string, user: any) => deleteDoc(doc(db, 'beritaAcaraUjian', id));

export const getDaftarHadirPengawas = async (userProfile: UserProfile): Promise<DaftarHadirPengawas[]> => {
  try {
    const q = query(collection(db, 'daftarHadirPengawas'), orderBy('tanggalUjian', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as DaftarHadirPengawas));
  } catch (e) { return []; }
};

export const addDaftarHadirPengawas = async (data: any) => addDoc(collection(db, 'daftarHadirPengawas'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
export const deleteDaftarHadirPengawas = async (id: string, user: any) => deleteDoc(doc(db, 'daftarHadirPengawas', id));

export const getAcademicYearSettings = async (): Promise<AcademicYearSetting[]> => {
  try {
    const snap = await getDocs(collection(db, 'academicYearConfigs'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AcademicYearSetting));
  } catch (e) { return []; }
};

export const setAcademicYearActiveStatus = async (year: string, isActive: boolean) => {
  const id = year.replace(/\//g, '_');
  return setDoc(doc(db, 'academicYearConfigs', id), { year, isActive }, { merge: true });
};

export const deleteMultipleStudents = async (ids: string[]) => {
  const batch = writeBatch(db);
  ids.forEach(id => batch.delete(doc(db, 'siswa', id)));
  return batch.commit();
};
