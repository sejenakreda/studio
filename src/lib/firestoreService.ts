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
  QuerySnapshot,
  FirestoreError
} from 'firebase/firestore';
import { db, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { Bobot, Siswa, Nilai, UserProfile, Role, ActivityLog, AcademicYearSetting, KkmSetting, MataPelajaranMaster, Pengumuman, PrioritasPengumuman, TeacherDailyAttendance, TeacherDailyAttendanceStatus, SchoolProfile, ClassDetail, SaranaDetail, SchoolStats, TugasTambahan, PelanggaranSiswa, LaporanKegiatan, AgendaKelas, PrintSettings, SchoolHoliday, BeritaAcaraUjian } from '@/types';
import { User } from 'firebase/auth';
import { getCurrentAcademicYear } from './utils';

// --- Generic Error Handler ---
const handleFirestoreError = (error: any, operation: string, collectionName: string): never => {
  console.error(`Firestore Error during ${operation} on ${collectionName}:`, error);
  let userMessage = `Gagal ${operation} data di '${collectionName}'.`;
  if (error instanceof FirestoreError) {
    if (error.code === 'permission-denied') {
      userMessage = `Error Izin: Anda tidak memiliki hak untuk ${operation} data di '${collectionName}'. Pastikan aturan Firestore ('firestore.rules') sudah benar.`;
    } else if (error.code === 'unauthenticated') {
      userMessage = `Error Autentikasi: Anda harus login untuk ${operation} data.`;
    } else {
      userMessage = `Terjadi error Firestore (${error.code}) saat ${operation}.`;
    }
  }
  throw new Error(userMessage);
};


// --- Converters (unchanged) ---

const bobotConverter: FirestoreDataConverter<Bobot> = {
  toFirestore: (bobot: Bobot): DocumentData => {
    const data: any = { ...bobot };
    return {
        tugas: bobot.tugas || 0,
        tes: bobot.tes || 0,
        pts: bobot.pts || 0,
        pas: bobot.pas || 0,
        kehadiran: bobot.kehadiran || 0,
        eskul: bobot.eskul || 0,
        osis: bobot.osis || 0,
        totalHariEfektifGanjil: bobot.totalHariEfektifGanjil || 90,
        totalHariEfektifGenap: bobot.totalHariEfektifGenap || 90,
    };
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Bobot => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      tugas: data.tugas || 0,
      tes: data.tes || 0,
      pts: data.pts || 0,
      pas: data.pas || 0,
      kehadiran: data.kehadiran || 0,
      eskul: data.eskul || 0,
      osis: data.osis || 0,
      totalHariEfektifGanjil: typeof data.totalHariEfektifGanjil === 'number' ? data.totalHariEfektifGanjil : 90,
      totalHariEfektifGenap: typeof data.totalHariEfektifGenap === 'number' ? data.totalHariEfektifGenap : 90,
    };
  }
};

const siswaConverter: FirestoreDataConverter<Siswa> = {
  toFirestore: (siswa: Siswa): DocumentData => {
    const data: any = { ...siswa };
    delete data.id;
    return {
      ...data,
      kegiatan: siswa.kegiatan || [],
    };
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Siswa => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      id_siswa: data.id_siswa,
      nama: data.nama,
      nis: data.nis,
      kelas: data.kelas,
      kegiatan: data.kegiatan || [],
    };
  }
};

const nilaiConverter: FirestoreDataConverter<Nilai> = {
  toFirestore: (nilai: Omit<Nilai, 'id'>): DocumentData => {
    const { ...dataToStore } = nilai;
    const data: any = { ...dataToStore };
    if (!data.createdAt) {
      data.createdAt = serverTimestamp();
    }
    data.updatedAt = serverTimestamp();
    return data;
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Nilai => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      id_siswa: data.id_siswa,
      mapel: data.mapel,
      semester: data.semester,
      tahun_ajaran: data.tahun_ajaran,
      tugas: data.tugas || [],
      tes: data.tes,
      pts: data.pts,
      pas: data.pas,
      kehadiran: data.kehadiran,
      eskul: data.eskul,
      osis: data.osis,
      nilai_akhir: data.nilai_akhir,
      teacherUid: data.teacherUid,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
};

const userProfileConverter: FirestoreDataConverter<UserProfile> = {
  toFirestore: (profile: UserProfile): DocumentData => {
    const { uid, ...dataToStore } = profile;
    return {
        ...dataToStore,
        email: profile.email,
        displayName: profile.displayName,
        role: profile.role,
        assignedMapel: profile.assignedMapel || [],
        tugasTambahan: profile.tugasTambahan || [],
        createdAt: profile.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): UserProfile => {
    const data = snapshot.data(options)!;
    const profile: UserProfile = {
      uid: snapshot.id,
      email: data.email || null,
      displayName: data.displayName || null,
      role: data.role as Role,
      assignedMapel: Array.isArray(data.assignedMapel) ? data.assignedMapel : [],
      tugasTambahan: Array.isArray(data.tugasTambahan) ? data.tugasTambahan : [],
      fcmToken: data.fcmToken,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
    return profile;
  }
};

const activityLogConverter: FirestoreDataConverter<ActivityLog> = {
  toFirestore: (log: Omit<ActivityLog, 'id'>): DocumentData => {
    return {
      timestamp: log.timestamp,
      action: log.action,
      details: log.details,
      userId: log.userId,
      userName: log.userName,
    };
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): ActivityLog => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      timestamp: data.timestamp,
      action: data.action,
      details: data.details,
      userId: data.userId,
      userName: data.userName,
    };
  }
};

const academicYearSettingConverter: FirestoreDataConverter<AcademicYearSetting> = {
  toFirestore: (setting: AcademicYearSetting): DocumentData => {
    return {
      year: setting.year,
      isActive: setting.isActive,
    };
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): AcademicYearSetting => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      year: data.year,
      isActive: data.isActive,
    };
  }
};

const kkmSettingConverter: FirestoreDataConverter<KkmSetting> = {
  toFirestore: (setting: Omit<KkmSetting, 'id'>): DocumentData => {
    return {
      mapel: setting.mapel,
      tahun_ajaran: setting.tahun_ajaran,
      kkmValue: setting.kkmValue,
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): KkmSetting => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      mapel: data.mapel,
      tahun_ajaran: data.tahun_ajaran,
      kkmValue: data.kkmValue,
      updatedAt: data.updatedAt,
    };
  }
};

const mataPelajaranMasterConverter: FirestoreDataConverter<MataPelajaranMaster> = {
  toFirestore: (mapel: Omit<MataPelajaranMaster, 'id' | 'createdAt'> & { createdAt?: Timestamp }): DocumentData => {
    return {
      namaMapel: mapel.namaMapel,
      createdAt: mapel.createdAt || serverTimestamp(),
    };
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): MataPelajaranMaster => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      namaMapel: data.namaMapel,
      createdAt: data.createdAt,
    };
  }
};

const pengumumanConverter: FirestoreDataConverter<Pengumuman> = {
  toFirestore: (pengumuman: Omit<Pengumuman, 'id'>): DocumentData => {
    return {
      judul: pengumuman.judul,
      isi: pengumuman.isi,
      prioritas: pengumuman.prioritas,
      infoTambahan: pengumuman.infoTambahan || null,
      createdAt: pengumuman.createdAt || serverTimestamp(),
      createdByUid: pengumuman.createdByUid || null,
      createdByDisplayName: pengumuman.createdByDisplayName || null,
    };
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Pengumuman => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      judul: data.judul,
      isi: data.isi,
      prioritas: data.prioritas,
      infoTambahan: data.infoTambahan,
      createdAt: data.createdAt,
      createdByUid: data.createdByUid,
      createdByDisplayName: data.createdByDisplayName,
    };
  }
};

const teacherDailyAttendanceConverter: FirestoreDataConverter<TeacherDailyAttendance> = {
  toFirestore: (attendance: Omit<TeacherDailyAttendance, 'id'>): DocumentData => {
    return {
      teacherUid: attendance.teacherUid,
      teacherName: attendance.teacherName || 'Guru',
      date: attendance.date,
      status: attendance.status,
      notes: attendance.notes || '',
      recordedAt: attendance.recordedAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastUpdatedByUid: attendance.lastUpdatedByUid || attendance.teacherUid,
    };
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): TeacherDailyAttendance => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      teacherUid: data.teacherUid,
      teacherName: data.teacherName,
      date: data.date,
      status: data.status,
      notes: data.notes,
      recordedAt: data.recordedAt,
      updatedAt: data.updatedAt,
      lastUpdatedByUid: data.lastUpdatedByUid,
    };
  }
};

const schoolProfileConverter: FirestoreDataConverter<SchoolProfile> = {
  toFirestore: (profile: Partial<Omit<SchoolProfile, 'id'>>): DocumentData => {
    return {
      stats: profile.stats || { alumni: { ril: 0, dapodik: 0 }, guru: { ril: 0, dapodik: 0 }, tendik: { ril: 0, dapodik: 0 } },
      classDetails: profile.classDetails || [],
      sarana: profile.sarana || [],
      totalSiswa: profile.totalSiswa ?? 0,
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): SchoolProfile => {
    const data = snapshot.data(options)!;

    const stats: SchoolStats = data.stats || {
      alumni: { ril: data.totalAlumni || 0, dapodik: 0 },
      guru: { ril: data.totalGuru || 0, dapodik: 0 },
      tendik: { ril: data.totalTendik || 0, dapodik: 0 },
    };

    const classDetailsData = data.classDetails || [];
    const convertedClassDetails = classDetailsData.map((cd: any) => {
        if (typeof cd.male === 'number' || typeof cd.female === 'number') {
            return {
                className: cd.className,
                male: { ril: cd.male || 0, dapodik: 0 },
                female: { ril: cd.female || 0, dapodik: 0 },
            };
        }
        return {
            className: cd.className,
            male: { ril: cd.male?.ril || 0, dapodik: cd.male?.dapodik || 0 },
            female: { ril: cd.female?.ril || 0, dapodik: cd.female?.dapodik || 0 },
        };
    });

    return {
      id: snapshot.id,
      stats: stats,
      totalSiswa: data.totalSiswa || 0,
      classDetails: convertedClassDetails,
      sarana: data.sarana || [],
      updatedAt: data.updatedAt,
    };
  }
};

const pelanggaranConverter: FirestoreDataConverter<PelanggaranSiswa> = {
  toFirestore(pelanggaran: Omit<PelanggaranSiswa, 'id'>): DocumentData {
    return {
      ...pelanggaran,
      createdAt: pelanggaran.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): PelanggaranSiswa {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      id_siswa: data.id_siswa,
      namaSiswa: data.namaSiswa,
      kelasSiswa: data.kelasSiswa,
      tanggal: data.tanggal,
      pelanggaran: data.pelanggaran,
      catatan: data.catatan,
      poin: data.poin,
      recordedByUid: data.recordedByUid,
      recordedByName: data.recordedByName,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
};

const laporanKegiatanConverter: FirestoreDataConverter<LaporanKegiatan> = {
  toFirestore(laporan: Omit<LaporanKegiatan, 'id'>): DocumentData {
    const data: Partial<LaporanKegiatan> = { ...laporan };
    delete data.id;
    return {
      ...data,
      createdAt: data.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): LaporanKegiatan {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      activityId: data.activityId,
      activityName: data.activityName,
      title: data.title,
      content: data.content,
      date: data.date,
      createdByUid: data.createdByUid,
      createdByDisplayName: data.createdByDisplayName,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
};

const agendaKelasConverter: FirestoreDataConverter<AgendaKelas> = {
    toFirestore(agenda: Omit<AgendaKelas, 'id'>): DocumentData {
        return {
            ...agenda,
            createdAt: agenda.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): AgendaKelas {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            teacherUid: data.teacherUid,
            teacherName: data.teacherName,
            kelas: data.kelas,
            mapel: data.mapel,
            tanggal: data.tanggal,
            jamKe: data.jamKe,
            tujuanPembelajaran: data.tujuanPembelajaran,
            pokokBahasan: data.pokokBahasan,
            siswaAbsen: data.siswaAbsen || [],
            refleksi: data.refleksi,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        };
    }
};

const printSettingsConverter: FirestoreDataConverter<PrintSettings> = {
  toFirestore(settings: Partial<Omit<PrintSettings, 'id'>>): DocumentData {
    return {
      headerImageUrl: settings.headerImageUrl || null,
      place: settings.place || '',
      signerOneName: settings.signerOneName || '',
      signerOnePosition: settings.signerOnePosition || '',
      signerOneNpa: settings.signerOneNpa || '',
      signerTwoName: settings.signerTwoName || '',
      signerTwoPosition: settings.signerTwoPosition || '',
      signerTwoNpa: settings.signerTwoNpa || '',
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): PrintSettings {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      headerImageUrl: data.headerImageUrl,
      place: data.place,
      signerOneName: data.signerOneName,
      signerOnePosition: data.signerOnePosition,
      signerOneNpa: data.signerOneNpa,
      signerTwoName: data.signerTwoName,
      signerTwoPosition: data.signerTwoPosition,
      signerTwoNpa: data.signerTwoNpa,
      updatedAt: data.updatedAt,
    };
  }
};

const schoolHolidayConverter: FirestoreDataConverter<SchoolHoliday> = {
  toFirestore: (holiday: Omit<SchoolHoliday, 'id' | 'createdAt'>): DocumentData => {
    return {
      dateString: holiday.dateString,
      description: holiday.description,
      createdAt: serverTimestamp(),
    };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): SchoolHoliday => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      dateString: data.dateString,
      description: data.description,
      createdAt: data.createdAt,
    };
  },
};

const beritaAcaraConverter: FirestoreDataConverter<BeritaAcaraUjian> = {
  toFirestore(beritaAcara: Omit<BeritaAcaraUjian, 'id'>): DocumentData {
    return {
      ...beritaAcara,
      createdAt: beritaAcara.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): BeritaAcaraUjian {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      jenisUjian: data.jenisUjian,
      tahunPelajaran: data.tahunPelajaran,
      mataUjian: data.mataUjian,
      hari: data.hari,
      tanggal: data.tanggal,
      bulan: data.bulan,
      tahun: data.tahun,
      waktuMulai: data.waktuMulai,
      waktuSelesai: data.waktuSelesai,
      ruangUjian: data.ruangUjian,
      kelasDigabung: data.kelasDigabung,
      jumlahPesertaX: data.jumlahPesertaX,
      jumlahPesertaXI: data.jumlahPesertaXI,
      jumlahPesertaXII: data.jumlahPesertaXII,
      pesertaHadirNomor: data.pesertaHadirNomor,
      pesertaAbsenNomor: data.pesertaAbsenNomor,
      jumlahDaftarHadir: data.jumlahDaftarHadir,
      jumlahBeritaAcara: data.jumlahBeritaAcara,
      catatanUjian: data.catatanUjian,
      pengawasNama: data.pengawasNama,
      pengawasTandaTanganUrl: data.pengawasTandaTanganUrl,
      createdByUid: data.createdByUid,
      createdByDisplayName: data.createdByDisplayName,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};

// --- Service Functions with Error Handling ---

// --- Berita Acara Ujian Service ---
const BERITA_ACARA_COLLECTION = 'beritaAcaraUjian';

export const addBeritaAcara = async (data: Omit<BeritaAcaraUjian, 'id' | 'createdAt' | 'updatedAt'>): Promise<BeritaAcaraUjian> => {
  try {
    const collRef = collection(db, BERITA_ACARA_COLLECTION).withConverter(beritaAcaraConverter);
    const docRef = await addDoc(collRef, data);
    return { id: docRef.id, ...data, createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
  } catch (error) {
    handleFirestoreError(error, 'menambah', BERITA_ACARA_COLLECTION);
  }
};

export const getBeritaAcara = async (user: UserProfile): Promise<BeritaAcaraUjian[]> => {
  try {
    const collRef = collection(db, BERITA_ACARA_COLLECTION).withConverter(beritaAcaraConverter);
    let q;
    if (user.role === 'admin') {
      q = query(collRef, orderBy('createdAt', 'desc'));
    } else {
      q = query(collRef, where('createdByUid', '==', user.uid), orderBy('createdAt', 'desc'));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, 'membaca semua', BERITA_ACARA_COLLECTION);
  }
};

export const getBeritaAcaraById = async (id: string): Promise<BeritaAcaraUjian | null> => {
  try {
    const docRef = doc(db, BERITA_ACARA_COLLECTION, id).withConverter(beritaAcaraConverter);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    handleFirestoreError(error, 'membaca', BERITA_ACARA_COLLECTION);
  }
};

export const updateBeritaAcara = async (id: string, data: Partial<Omit<BeritaAcaraUjian, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, BERITA_ACARA_COLLECTION, id);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, 'memperbarui', BERITA_ACARA_COLLECTION);
  }
};

export const deleteBeritaAcara = async (id: string, user: UserProfile): Promise<void> => {
  try {
    const docRef = doc(db, BERITA_ACARA_COLLECTION, id);
    if (user.role !== 'admin') {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists() || docSnap.data().createdByUid !== user.uid) {
        throw new Error("Anda tidak memiliki izin untuk menghapus dokumen ini.");
      }
    }
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, 'menghapus', BERITA_ACARA_COLLECTION);
  }
};


// --- Bobot Service ---
const WEIGHTS_DOC_ID = 'global_weights';
export const getWeights = async (): Promise<Bobot> => {
  try {
    const docRef = doc(db, 'bobot', WEIGHTS_DOC_ID).withConverter(bobotConverter);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data();
    return {
      id: WEIGHTS_DOC_ID, tugas: 20, tes: 20, pts: 20, pas: 25,
      kehadiran: 15, eskul: 5, osis: 5, totalHariEfektifGanjil: 90, totalHariEfektifGenap: 90
    };
  } catch (error) {
    handleFirestoreError(error, 'membaca', 'bobot');
  }
};
export const updateWeights = async (bobotData: Partial<Bobot>): Promise<void> => {
  try {
    const docRef = doc(db, 'bobot', WEIGHTS_DOC_ID).withConverter(bobotConverter);
    await setDoc(docRef, bobotData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'memperbarui', 'bobot');
  }
};

// --- Siswa (Student) Service ---
export const addStudent = async (siswa: Omit<Siswa, 'id'>): Promise<Siswa> => {
  try {
    const collRef = collection(db, 'siswa').withConverter(siswaConverter);
    const docRef = await addDoc(collRef, siswa);
    return { ...siswa, id: docRef.id };
  } catch (error) {
    handleFirestoreError(error, 'menambah', 'siswa');
  }
};
export const getStudents = async (): Promise<Siswa[]> => {
  try {
    const collRef = collection(db, 'siswa').withConverter(siswaConverter);
    const q = query(collRef);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, 'membaca daftar', 'siswa');
  }
};
export const getStudentById = async (id: string): Promise<Siswa | null> => {
  try {
    const docRef = doc(db, 'siswa', id).withConverter(siswaConverter);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    handleFirestoreError(error, 'membaca', 'siswa');
  }
};
export const updateStudent = async (id: string, siswaData: Partial<Siswa>): Promise<void> => {
  try {
    const { id_siswa, ...updatableData } = siswaData;
    const docRef = doc(db, 'siswa', id);
    await updateDoc(docRef, updatableData);
  } catch (error) {
    handleFirestoreError(error, 'memperbarui', 'siswa');
  }
};
export const deleteStudent = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'siswa', id);
    const studentSnapshot = await getDoc(doc(db, 'siswa', id).withConverter(siswaConverter));
    if (!studentSnapshot.exists()) {
      console.warn(`Siswa dengan ID (dokumen) ${id} tidak ditemukan.`);
      return;
    }
    const studentData = studentSnapshot.data();
    if (!studentData) {
        await deleteDoc(docRef);
        return;
    }
    const studentSpecificId = studentData.id_siswa;
    await deleteDoc(docRef);
    const gradesQuery = query(collection(db, 'nilai'), where('id_siswa', '==', studentSpecificId));
    const gradesSnapshot = await getDocs(gradesQuery);
    const batch = writeBatch(db);
    gradesSnapshot.docs.forEach(nilaiDoc => batch.delete(nilaiDoc.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, 'menghapus', 'siswa');
  }
};
export const updateStudentActivity = async (studentId: string, activity: TugasTambahan, type: 'add' | 'remove'): Promise<void> => {
  try {
    const studentRef = doc(db, 'siswa', studentId);
    if (type === 'add') {
      await updateDoc(studentRef, { kegiatan: arrayUnion(activity) });
    } else {
      await updateDoc(studentRef, { kegiatan: arrayRemove(activity) });
    }
  } catch (error) {
    handleFirestoreError(error, `memperbarui kegiatan`, 'siswa');
  }
};
export const deleteMultipleStudents = async (studentDocIds: string[]): Promise<void> => {
  if (studentDocIds.length === 0) return;

  try {
    const batch = writeBatch(db);
    const studentUniqueIds: string[] = [];

    // First pass: Get all unique student IDs and mark their docs for deletion.
    for (const docId of studentDocIds) {
      const studentRef = doc(db, 'siswa', docId);
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        const studentData = studentSnap.data() as Siswa;
        if (studentData.id_siswa) {
          studentUniqueIds.push(studentData.id_siswa);
        }
        batch.delete(studentRef);
      }
    }

    // Second pass: Query for all related grades in chunks and mark them for deletion.
    if (studentUniqueIds.length > 0) {
      const CHUNK_SIZE = 30; // Firestore 'in' query limit
      for (let i = 0; i < studentUniqueIds.length; i += CHUNK_SIZE) {
        const chunk = studentUniqueIds.slice(i, i + CHUNK_SIZE);
        if (chunk.length > 0) {
          const gradesQuery = query(collection(db, 'nilai'), where('id_siswa', 'in', chunk));
          const gradesSnapshot = await getDocs(gradesQuery);
          gradesSnapshot.docs.forEach(gradeDoc => {
            batch.delete(gradeDoc.ref);
          });
        }
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, 'menghapus banyak', 'siswa');
  }
};


// --- Nilai (Grade) Service ---
export const addOrUpdateGrade = async (nilai: Omit<Nilai, 'id'>, teacherUid: string, gradeId?: string): Promise<Nilai> => {
  try {
      const gradesCollRef = collection(db, 'nilai').withConverter(nilaiConverter);
      const nilaiToProcess = { ...nilai, teacherUid };

      if (gradeId) {
          const docRef = doc(gradesCollRef, gradeId);
          const updateData: Partial<Nilai> = { ...nilaiToProcess, updatedAt: serverTimestamp() as Timestamp };
          delete updateData.createdAt;
          await updateDoc(docRef, updateData as DocumentData);
          const updatedDoc = await getDoc(docRef);
          return updatedDoc.data()!;
      }
      
      const q = query(gradesCollRef,
          where('teacherUid', '==', teacherUid),
          where('id_siswa', '==', nilaiToProcess.id_siswa),
          where('mapel', '==', nilaiToProcess.mapel),
          where('semester', '==', nilaiToProcess.semester),
          where('tahun_ajaran', '==', nilaiToProcess.tahun_ajaran),
          limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
          const existingDoc = querySnapshot.docs[0];
          const updateData: Partial<Nilai> = { ...nilaiToProcess, updatedAt: serverTimestamp() as Timestamp };
          delete updateData.createdAt;
          await updateDoc(existingDoc.ref, updateData as DocumentData);
          return { ...existingDoc.data(), ...updateData, id: existingDoc.id };
      } else {
          const dataForAdd = { ...nilaiToProcess, createdAt: serverTimestamp() as Timestamp, updatedAt: serverTimestamp() as Timestamp };
          const docRef = await addDoc(gradesCollRef, dataForAdd);
          return { ...dataForAdd, id: docRef.id };
      }
    } catch (error) {
      handleFirestoreError(error, 'menyimpan', 'nilai');
    }
};

export const getGrade = async (id_siswa: string, semester: number, tahun_ajaran: string, mapel: string, teacherUid: string): Promise<Nilai | null> => {
  try {
    const gradesCollRef = collection(db, 'nilai').withConverter(nilaiConverter);
    const q = query(gradesCollRef,
      where('teacherUid', '==', teacherUid),
      where('id_siswa', '==', id_siswa),
      where('mapel', '==', mapel),
      where('semester', '==', semester),
      where('tahun_ajaran', '==', tahun_ajaran),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) return querySnapshot.docs[0].data();
    return null;
  } catch (error) {
    handleFirestoreError(error, 'membaca', 'nilai');
  }
}
export const getGradesByStudentId = async (id_siswa: string): Promise<Nilai[]> => {
  try {
    const collRef = collection(db, 'nilai').withConverter(nilaiConverter);
    const q = query(collRef,
      where('id_siswa', '==', id_siswa)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, 'membaca nilai', 'siswa');
  }
};
export const getAllGrades = async (): Promise<Nilai[]> => {
  try {
    const collRef = collection(db, 'nilai').withConverter(nilaiConverter);
    const q = query(collRef);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, 'membaca semua', 'nilai');
  }
};
export const getGradesForTeacherDisplay = async (
  teacherUid: string,
  mapelList: string[],
  tahunAjaran: string,
  semester: number
): Promise<Nilai[]> => {
  try {
    if (mapelList.length === 0 || !teacherUid) return [];

    const gradesQuery = query(
      collection(db, 'nilai').withConverter(nilaiConverter),
      where('teacherUid', '==', teacherUid),
      where('mapel', 'in', mapelList),
      where('tahun_ajaran', '==', tahunAjaran),
      where('semester', '==', semester)
    );

    const querySnapshot = await getDocs(gradesQuery);
    return querySnapshot.docs.map(doc => doc.data());

  } catch (error) {
    handleFirestoreError(error, 'membaca nilai', 'guru');
  }
};
export const getUniqueMapelNamesFromGrades = async (assignedMapelList?: string[], teacherUid?: string): Promise<string[]> => {
  try {
    const gradesCollRef = collection(db, 'nilai');
    const qConstraints = teacherUid ? [where('teacherUid', '==', teacherUid)] : [];
    const q = query(gradesCollRef, ...qConstraints);
    const querySnapshot = await getDocs(q);
    const mapelSet = new Set<string>();
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.mapel) {
        if (teacherUid && assignedMapelList?.length) {
          if (assignedMapelList.includes(data.mapel)) mapelSet.add(data.mapel);
        } else {
          mapelSet.add(data.mapel);
        }
      }
    });
    return Array.from(mapelSet).sort();
  } catch (error) {
    handleFirestoreError(error, 'membaca daftar', 'mapel');
  }
};
export const deleteGradeById = async (gradeId: string): Promise<void> => {
  try {
    if (!gradeId) throw new Error("Grade ID is required.");
    await deleteDoc(doc(db, 'nilai', gradeId));
  } catch (error) {
    handleFirestoreError(error, 'menghapus', 'nilai');
  }
};

// --- User Profile Service ---
export const createUserProfile = async (
  firebaseUser: User, role: Role, displayName?: string,
  assignedMapel?: string[], tugasTambahan?: TugasTambahan[]
): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', firebaseUser.uid).withConverter(userProfileConverter);
    const profile: UserProfile = {
      uid: firebaseUser.uid, email: firebaseUser.email,
      displayName: displayName || firebaseUser.displayName || 'Pengguna Baru',
      role: role, assignedMapel: assignedMapel || [], tugasTambahan: tugasTambahan || [],
      createdAt: serverTimestamp() as Timestamp, updatedAt: serverTimestamp() as Timestamp,
    };
    await setDoc(userDocRef, profile);
  } catch (error) {
    handleFirestoreError(error, 'membuat', 'profil pengguna');
  }
};
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, 'users', uid).withConverter(userProfileConverter);
    const docSnap = await getDoc(userDocRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    handleFirestoreError(error, 'membaca', 'profil pengguna');
  }
};
export const getAllUsersByRole = async (role: Role): Promise<UserProfile[]> => {
  try {
    const usersCollRef = collection(db, 'users').withConverter(userProfileConverter);
    const q = query(usersCollRef, where('role', '==', role));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, 'membaca daftar', `pengguna dengan peran ${role}`);
  }
};
export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', uid).withConverter(userProfileConverter);
    const updateData: any = { ...data, updatedAt: serverTimestamp() };
    if (data.hasOwnProperty('assignedMapel')) updateData.assignedMapel = data.assignedMapel || [];
    if (data.hasOwnProperty('tugasTambahan')) updateData.tugasTambahan = data.tugasTambahan || [];
    delete updateData.uid; delete updateData.email; delete updateData.role; delete updateData.createdAt;
    await updateDoc(userDocRef, updateData);
  } catch (error) {
    handleFirestoreError(error, 'memperbarui', 'profil pengguna');
  }
};
export const deleteUserRecord = async (uid: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, 'menghapus', 'profil pengguna');
  }
};

// --- Activity Log Service ---
export const addActivityLog = async (action: string, details?: string, userId?: string, userName?: string): Promise<void> => {
  try {
    const collRef = collection(db, 'activity_logs').withConverter(activityLogConverter);
    await addDoc(collRef, { timestamp: serverTimestamp() as Timestamp, action, details, userId, userName });
  } catch (error) {
    handleFirestoreError(error, 'menambah', 'log aktivitas');
  }
};
export const getRecentActivityLogs = async (count = 5): Promise<ActivityLog[]> => {
  try {
    const collRef = collection(db, 'activity_logs').withConverter(activityLogConverter);
    const q = query(collRef, orderBy('timestamp', 'desc'), limit(count));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, 'membaca', 'log aktivitas');
  }
};

// --- Academic Year Settings Service ---
const ACADEMIC_YEAR_CONFIGS_COLLECTION = 'academicYearConfigs';
export const getAcademicYearSettings = async (): Promise<AcademicYearSetting[]> => {
  try {
    const collRef = collection(db, ACADEMIC_YEAR_CONFIGS_COLLECTION).withConverter(academicYearSettingConverter);
    const q = query(collRef);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, 'membaca', 'pengaturan tahun ajaran');
  }
};
export const setAcademicYearActiveStatus = async (year: string, isActive: boolean): Promise<void> => {
  try {
    const docId = year.replace(/\//g, '_');
    const docRef = doc(db, ACADEMIC_YEAR_CONFIGS_COLLECTION, docId).withConverter(academicYearSettingConverter);
    await setDoc(docRef, { year, isActive }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'mengatur', 'status tahun ajaran');
  }
};
export const getActiveAcademicYears = async (): Promise<string[]> => {
  const settings = await getAcademicYearSettings();
  const activeYears = settings.filter(s => s.isActive).map(s => s.year).sort((a, b) => b.localeCompare(a));
  if (activeYears.length === 0) return [getCurrentAcademicYear()];
  return activeYears;
};

// --- KKM Settings Service ---
const KKM_SETTINGS_COLLECTION = 'kkm_settings';
const generateKkmDocId = (mapel: string, tahun_ajaran: string) => `${mapel.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_${tahun_ajaran.replace('/', '-')}`;

export const getKkmSetting = async (mapel: string, tahun_ajaran: string): Promise<KkmSetting | null> => {
  try {
    if (!mapel || !tahun_ajaran) return null;
    const docId = generateKkmDocId(mapel, tahun_ajaran);
    const docRef = doc(db, KKM_SETTINGS_COLLECTION, docId).withConverter(kkmSettingConverter);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    handleFirestoreError(error, 'membaca', 'pengaturan KKM');
  }
};
export const setKkmSetting = async (kkmData: Omit<KkmSetting, 'id' | 'updatedAt'>): Promise<void> => {
  try {
    if (!kkmData.mapel || !kkmData.tahun_ajaran) throw new Error("Mapel and Tahun Ajaran are required.");
    const docId = generateKkmDocId(kkmData.mapel, kkmData.tahun_ajaran);
    const docRef = doc(db, KKM_SETTINGS_COLLECTION, docId).withConverter(kkmSettingConverter);
    await setDoc(docRef, kkmData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'mengatur', 'pengaturan KKM');
  }
};
export const getAllKkmSettings = async (): Promise<KkmSetting[]> => {
  try {
    const collRef = collection(db, KKM_SETTINGS_COLLECTION).withConverter(kkmSettingConverter);
    const q = query(collRef, orderBy('mapel', 'asc'), orderBy('tahun_ajaran', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, 'membaca semua', 'pengaturan KKM');
  }
};

// --- Mata Pelajaran Master Service ---
const MATA_PELAJARAN_MASTER_COLLECTION = 'mataPelajaranMaster';
export const addMataPelajaranMaster = async (namaMapel: string): Promise<MataPelajaranMaster> => {
  try {
    const collRef = collection(db, MATA_PELAJARAN_MASTER_COLLECTION).withConverter(mataPelajaranMasterConverter);
    const q = query(collRef, where("namaMapel", "==", namaMapel));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) throw new Error(`Mata pelajaran "${namaMapel}" sudah ada.`);
    const docRef = await addDoc(collRef, { namaMapel, createdAt: serverTimestamp() } as any);
    return { id: docRef.id, namaMapel, createdAt: Timestamp.now() };
  } catch (error) {
    handleFirestoreError(error, 'menambah', 'master mata pelajaran');
  }
};
export const getMataPelajaranMaster = async (): Promise<MataPelajaranMaster[]> => {
  try {
    const collRef = collection(db, MATA_PELAJARAN_MASTER_COLLECTION).withConverter(mataPelajaranMasterConverter);
    const q = query(collRef, orderBy("namaMapel", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, 'membaca', 'master mata pelajaran');
  }
};
export const deleteMataPelajaranMaster = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, MATA_PELAJARAN_MASTER_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, 'menghapus', 'master mata pelajaran');
  }
};

// --- Pengumuman (Announcement) Service ---
const PENGUMUMAN_COLLECTION = 'pengumuman';
export const addPengumuman = async (data: Omit<Pengumuman, 'id' | 'createdAt'>): Promise<Pengumuman> => {
  try {
    const collRef = collection(db, PENGUMUMAN_COLLECTION).withConverter(pengumumanConverter);
    const dataToSave = { ...data, createdAt: serverTimestamp() as Timestamp };
    const docRef = await addDoc(collRef, dataToSave);
    return { ...dataToSave, id: docRef.id, createdAt: Timestamp.now() };
  } catch (error) {
    handleFirestoreError(error, 'menambah', 'pengumuman');
  }
};
export const getPengumumanUntukGuru = async (count = 5): Promise<Pengumuman[]> => {
  try {
    const collRef = collection(db, PENGUMUMAN_COLLECTION).withConverter(pengumumanConverter);
    const q = query(collRef, orderBy('createdAt', 'desc'), limit(count));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, 'membaca', 'pengumuman');
  }
};
export const getAllPengumuman = async (): Promise<Pengumuman[]> => {
  try {
    const collRef = collection(db, PENGUMUMAN_COLLECTION).withConverter(pengumumanConverter);
    const q = query(collRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, 'membaca semua', 'pengumuman');
  }
};
export const deletePengumuman = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, PENGUMUMAN_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, 'menghapus', 'pengumuman');
  }
};

// --- Teacher Daily Attendance Service (Input by Guru) ---
const TEACHER_DAILY_ATTENDANCE_COLLECTION = 'teacherDailyAttendance';
export const addOrUpdateTeacherDailyAttendance = async (attendanceData: Omit<TeacherDailyAttendance, 'id' | 'recordedAt' | 'updatedAt' | 'lastUpdatedByUid'> & { lastUpdatedByUid: string }): Promise<TeacherDailyAttendance> => {
  try {
    const { teacherUid, date, teacherName, lastUpdatedByUid } = attendanceData;
    const dateObj = date.toDate();
    const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    const docId = `${teacherUid}_${formattedDate}`;
    const docRef = doc(db, TEACHER_DAILY_ATTENDANCE_COLLECTION, docId).withConverter(teacherDailyAttendanceConverter);
    const docSnap = await getDoc(docRef);
    let dataToSave: TeacherDailyAttendance;
    if (docSnap.exists()) {
      dataToSave = { ...docSnap.data(), ...attendanceData, id: docId, updatedAt: serverTimestamp() as Timestamp, lastUpdatedByUid };
    } else {
      dataToSave = { ...attendanceData, id: docId, teacherName: teacherName || 'Guru', recordedAt: serverTimestamp() as Timestamp, updatedAt: serverTimestamp() as Timestamp, lastUpdatedByUid };
    }
    const { id, ...firestoreData } = dataToSave;
    await setDoc(docRef, firestoreData, { merge: true });
    const now = Timestamp.now();
    return { ...dataToSave, recordedAt: dataToSave.recordedAt instanceof Timestamp ? dataToSave.recordedAt : (docSnap.exists() ? docSnap.data().recordedAt : now), updatedAt: now };
  } catch (error) {
    handleFirestoreError(error, 'menyimpan', 'kehadiran harian guru');
  }
};
export const getTeacherDailyAttendanceForDate = async (teacherUid: string, date: Date): Promise<TeacherDailyAttendance | null> => {
  try {
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const docId = `${teacherUid}_${formattedDate}`;
    const docRef = doc(db, TEACHER_DAILY_ATTENDANCE_COLLECTION, docId).withConverter(teacherDailyAttendanceConverter);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.date && typeof data.date.toDate === 'function') {
            return data;
        } else {
            console.warn(`Attendance record ${docId} has malformed data and will be ignored. Data:`, data);
            return null;
        }
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, 'membaca', 'kehadiran harian guru');
  }
};
export const getTeacherDailyAttendanceForMonth = async (teacherUid: string, year: number, month: number): Promise<TeacherDailyAttendance[]> => {
  try {
    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);
    
    const collRef = collection(db, TEACHER_DAILY_ATTENDANCE_COLLECTION).withConverter(teacherDailyAttendanceConverter);
    
    const q = query(collRef, 
      where('teacherUid', '==', teacherUid),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => doc.data()).sort((a, b) => (a.date.toDate().getTime()) - (b.date.toDate().getTime()));
  } catch (error) {
    handleFirestoreError(error, 'membaca', 'rekap kehadiran bulanan');
  }
};
export const deleteTeacherDailyAttendance = async (id: string): Promise<void> => {
  try {
    if (!id) throw new Error("Document ID is required.");
    await deleteDoc(doc(db, TEACHER_DAILY_ATTENDANCE_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, 'menghapus', 'kehadiran harian guru');
  }
};
export const getAllTeachersDailyAttendanceForPeriod = async (year: number, month?: number | null): Promise<TeacherDailyAttendance[]> => {
  try {
    let startDate: Timestamp, endDate: Timestamp;
    if (month && month >= 1 && month <= 12) {
      startDate = Timestamp.fromDate(new Date(year, month - 1, 1));
      endDate = Timestamp.fromDate(new Date(year, month, 0, 23, 59, 59, 999));
    } else {
      startDate = Timestamp.fromDate(new Date(year, 0, 1));
      endDate = Timestamp.fromDate(new Date(year, 11, 31, 23, 59, 59, 999));
    }
    const collRef = collection(db, TEACHER_DAILY_ATTENDANCE_COLLECTION).withConverter(teacherDailyAttendanceConverter);
    const q = query(collRef, where('date', '>=', startDate), where('date', '<=', endDate));
    const querySnapshot = await getDocs(q);
    const records = querySnapshot.docs.map(doc => doc.data());
    return records.sort((a,b) => (b.date?.toDate()?.getTime() || 0) - (a.date?.toDate()?.getTime() || 0));
  } catch (error) {
    handleFirestoreError(error, 'membaca', 'semua kehadiran harian guru');
  }
};

// --- School Config Service (for School Profile & Print Settings) ---
const SCHOOL_CONFIG_COLLECTION = 'schoolConfig';
const SCHOOL_PROFILE_DOC_ID = 'main_profile';
const PRINT_SETTINGS_DOC_ID = 'print_settings';

export const getSchoolProfile = async (): Promise<SchoolProfile> => {
  try {
    const docRef = doc(db, SCHOOL_CONFIG_COLLECTION, SCHOOL_PROFILE_DOC_ID).withConverter(schoolProfileConverter);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data();
    return {
        id: SCHOOL_PROFILE_DOC_ID,
        stats: { alumni: { ril: 0, dapodik: 0 }, guru: { ril: 0, dapodik: 0 }, tendik: { ril: 0, dapodik: 0 } },
        totalSiswa: 0, classDetails: [], sarana: [],
    };
  } catch (error) {
    handleFirestoreError(error, 'membaca', 'profil sekolah');
  }
};
export const updateSchoolProfile = async (profileData: Partial<Omit<SchoolProfile, 'id'>>): Promise<void> => {
  try {
    const docRef = doc(db, SCHOOL_CONFIG_COLLECTION, SCHOOL_PROFILE_DOC_ID).withConverter(schoolProfileConverter);
    await setDoc(docRef, profileData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'memperbarui', 'profil sekolah');
  }
};

export const getPrintSettings = async (): Promise<PrintSettings> => {
  try {
    const docRef = doc(db, SCHOOL_CONFIG_COLLECTION, PRINT_SETTINGS_DOC_ID).withConverter(printSettingsConverter);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data();
    return {
      id: PRINT_SETTINGS_DOC_ID,
      place: "Cianjur", // Default value
      signerOneName: "Kepala Sekolah",
      signerOnePosition: "Kepala Sekolah",
      signerOneNpa: "",
      signerTwoName: "Wali Kelas",
      signerTwoPosition: "Wali Kelas",
      signerTwoNpa: "",
    };
  } catch (error) {
    handleFirestoreError(error, 'membaca', 'pengaturan cetak');
  }
};

export const updatePrintSettings = async (settings: Partial<Omit<PrintSettings, 'id' | 'updatedAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, SCHOOL_CONFIG_COLLECTION, PRINT_SETTINGS_DOC_ID);
    await setDoc(docRef, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'memperbarui', 'pengaturan cetak');
  }
};

// --- Pelanggaran Siswa (Student Violation) Service ---
const PELANGGARAN_COLLECTION = 'pelanggaran_siswa';

export const addPelanggaran = async (data: Omit<PelanggaranSiswa, 'id' | 'createdAt'>): Promise<PelanggaranSiswa> => {
  try {
    const collRef = collection(db, PELANGGARAN_COLLECTION).withConverter(pelanggaranConverter);
    const dataToSave = { ...data, createdAt: serverTimestamp() as Timestamp, updatedAt: serverTimestamp() as Timestamp };
    const docRef = await addDoc(collRef, dataToSave);
    return { ...dataToSave, id: docRef.id, createdAt: Timestamp.now() };
  } catch (error) {
    handleFirestoreError(error, 'menambah', 'pelanggaran siswa');
  }
};

export const updatePelanggaran = async (id: string, data: Partial<Omit<PelanggaranSiswa, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, PELANGGARAN_COLLECTION, id);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, 'memperbarui', 'pelanggaran siswa');
  }
};

export const getAllPelanggaran = async (): Promise<PelanggaranSiswa[]> => {
  try {
    const collRef = collection(db, PELANGGARAN_COLLECTION).withConverter(pelanggaranConverter);
    const q = query(collRef, orderBy('tanggal', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, 'membaca semua', 'pelanggaran siswa');
  }
};

export const deletePelanggaran = async (pelanggaranId: string): Promise<void> => {
  try {
    const docRef = doc(db, PELANGGARAN_COLLECTION, pelanggaranId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, 'menghapus', 'pelanggaran siswa');
  }
};


// --- Laporan Kegiatan Service ---
const LAPORAN_KEGIATAN_COLLECTION = 'laporan_kegiatan';

export const addLaporanKegiatan = async (data: Omit<LaporanKegiatan, 'id' | 'createdAt' | 'updatedAt'>): Promise<LaporanKegiatan> => {
  try {
    const collRef = collection(db, LAPORAN_KEGIATAN_COLLECTION).withConverter(laporanKegiatanConverter);
    const dataToSave = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() } as Omit<LaporanKegiatan, 'id'>;
    const docRef = await addDoc(collRef, dataToSave);
    return { ...dataToSave, id: docRef.id, createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
  } catch (error) {
    handleFirestoreError(error, 'menambah', 'laporan kegiatan');
  }
};

export const updateLaporanKegiatan = async (id: string, data: Partial<Omit<LaporanKegiatan, 'id' | 'createdAt' | 'activityId' | 'activityName' | 'createdByUid' | 'createdByDisplayName' >>): Promise<void> => {
  try {
    const docRef = doc(db, LAPORAN_KEGIATAN_COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, 'memperbarui', 'laporan kegiatan');
  }
};

export const getLaporanKegiatanByActivity = async (activityId: TugasTambahan, userUid: string): Promise<LaporanKegiatan[]> => {
  try {
    const collRef = collection(db, LAPORAN_KEGIATAN_COLLECTION).withConverter(laporanKegiatanConverter);
    const q = query(collRef, where('createdByUid', '==', userUid));
    const querySnapshot = await getDocs(q);
    const allUserReports = querySnapshot.docs.map(doc => doc.data());
    const finalReports = allUserReports.filter(report => report.activityId === activityId);
    return finalReports.sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  } catch (error) {
    handleFirestoreError(error, 'membaca', 'laporan kegiatan');
  }
};

export const getAllLaporanKegiatan = async (): Promise<LaporanKegiatan[]> => {
  try {
    const collRef = collection(db, LAPORAN_KEGIATAN_COLLECTION).withConverter(laporanKegiatanConverter);
    const q = query(collRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, 'membaca semua', 'laporan kegiatan');
  }
};

export const deleteLaporanKegiatan = async (laporanId: string): Promise<void> => {
  try {
    const docRef = doc(db, LAPORAN_KEGIATAN_COLLECTION, laporanId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, 'menghapus', 'laporan kegiatan');
  }
};


// --- Agenda Kelas Service ---
const AGENDA_KELAS_COLLECTION = 'agenda_kelas';

export const addOrUpdateAgendaKelas = async (data: Omit<AgendaKelas, 'id' | 'createdAt' | 'updatedAt'>, docIdToUpdate?: string): Promise<AgendaKelas> => {
  try {
    const coll = collection(db, AGENDA_KELAS_COLLECTION).withConverter(agendaKelasConverter);
    
    if (docIdToUpdate) {
        const docRef = doc(coll, docIdToUpdate);
        await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
        const updatedSnap = await getDoc(docRef);
        return updatedSnap.data() as AgendaKelas;
    } else {
        const docRef = await addDoc(coll, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        const newSnap = await getDoc(docRef);
        return newSnap.data() as AgendaKelas;
    }
  } catch (error) {
    handleFirestoreError(error, 'menyimpan', 'agenda kelas');
  }
};

export const getAgendasForTeacher = async (teacherUid: string, year: number, month: number): Promise<AgendaKelas[]> => {
  try {
    const coll = collection(db, AGENDA_KELAS_COLLECTION).withConverter(agendaKelasConverter);
    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);
    const q = query(coll, 
        where('teacherUid', '==', teacherUid)
    );
    const snapshot = await getDocs(q);
    const allTeacherAgendas = snapshot.docs.map(doc => doc.data());
    const agendasInMonth = allTeacherAgendas.filter(agenda => {
        const agendaDate = agenda.tanggal.toDate();
        return agendaDate >= startDate && agendaDate <= endDate;
    });
    return agendasInMonth.sort((a, b) => b.tanggal.toMillis() - a.tanggal.toMillis());
  } catch (error) {
    handleFirestoreError(error, 'membaca', 'agenda kelas');
  }
};

export const getAllAgendas = async (): Promise<AgendaKelas[]> => {
  try {
    const coll = collection(db, AGENDA_KELAS_COLLECTION).withConverter(agendaKelasConverter);
    const q = query(coll, orderBy('tanggal', 'desc'));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => doc.data());
    return data;
  } catch (error) {
    handleFirestoreError(error, 'membaca semua', 'agenda kelas');
  }
};

export const deleteAgenda = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, AGENDA_KELAS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, 'menghapus', 'agenda kelas');
  }
};

// --- School Holiday Service ---
const SCHOOL_HOLIDAYS_COLLECTION = 'schoolHolidays';

export const getSchoolHolidays = async (from: Date, to: Date): Promise<SchoolHoliday[]> => {
  try {
    const collRef = collection(db, SCHOOL_HOLIDAYS_COLLECTION).withConverter(schoolHolidayConverter);
    const q = query(collRef, where('dateString', '>=', from.toISOString().split('T')[0]), where('dateString', '<=', to.toISOString().split('T')[0]));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, 'membaca', 'hari libur sekolah');
  }
};

export const getSchoolHolidaysForMonth = async (year: number, month: number): Promise<SchoolHoliday[]> => {
    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const startString = `${year}-${String(month).padStart(2, '0')}-01`;
        const endString = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
        
        const collRef = collection(db, SCHOOL_HOLIDAYS_COLLECTION).withConverter(schoolHolidayConverter);
        const q = query(collRef, where('dateString', '>=', startString), where('dateString', '<=', endString));
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
        handleFirestoreError(error, 'membaca hari libur untuk bulan', 'hari libur sekolah');
    }
};

export const setSchoolHoliday = async (holiday: Omit<SchoolHoliday, 'id' | 'createdAt'>): Promise<void> => {
  try {
    const collRef = collection(db, SCHOOL_HOLIDAYS_COLLECTION).withConverter(schoolHolidayConverter);
    const docRef = doc(collRef); 
    await setDoc(docRef, holiday);
  } catch (error) {
    handleFirestoreError(error, 'mengatur', 'hari libur sekolah');
  }
};

export const deleteSchoolHoliday = async (dateString: string): Promise<void> => {
  try {
    const collRef = collection(db, SCHOOL_HOLIDAYS_COLLECTION).withConverter(schoolHolidayConverter);
    const q = query(collRef, where("dateString", "==", dateString));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.warn(`No holiday document found for dateString: ${dateString}`);
      return;
    }
    
    const batch = writeBatch(db);
    querySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

  } catch (error) {
    handleFirestoreError(error, 'menghapus', 'hari libur sekolah');
  }
};
