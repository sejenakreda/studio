
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
  QuerySnapshot
} from 'firebase/firestore';
import { db, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { Bobot, Siswa, Nilai, UserProfile, Role, ActivityLog, AcademicYearSetting, KkmSetting, MataPelajaranMaster, Pengumuman, PrioritasPengumuman, TeacherAttendance, TeacherDailyAttendance, TeacherDailyAttendanceStatus, SchoolProfile, ClassDetail, SaranaDetail, SchoolStats, TugasTambahan, PelanggaranSiswa, LaporanKegiatan, AgendaKelas } from '@/types';
import { User } from 'firebase/auth';
import { getCurrentAcademicYear } from './utils';

// --- Converters ---

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

const teacherAttendanceConverter: FirestoreDataConverter<TeacherAttendance> = {
  toFirestore: (attendance: Omit<TeacherAttendance, 'id'>): DocumentData => {
    const data: any = { ...attendance };
    if (!data.recordedAt) {
      data.recordedAt = serverTimestamp();
    }
    data.updatedAt = serverTimestamp();
    return data;
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): TeacherAttendance => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      teacherUid: data.teacherUid,
      teacherName: data.teacherName,
      month: data.month,
      year: data.year,
      daysPresent: data.daysPresent,
      daysAbsentWithReason: data.daysAbsentWithReason,
      daysAbsentWithoutReason: data.daysAbsentWithoutReason,
      totalSchoolDaysInMonth: data.totalSchoolDaysInMonth,
      notes: data.notes,
      recordedByUid: data.recordedByUid,
      recordedAt: data.recordedAt,
      updatedAt: data.updatedAt,
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


// --- Bobot Service ---
const WEIGHTS_DOC_ID = 'global_weights';
export const getWeights = async (): Promise<Bobot> => {
  const docRef = doc(db, 'bobot', WEIGHTS_DOC_ID).withConverter(bobotConverter);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) return docSnap.data();
  return {
    id: WEIGHTS_DOC_ID, tugas: 20, tes: 20, pts: 20, pas: 25,
    kehadiran: 15, eskul: 5, osis: 5, totalHariEfektifGanjil: 90, totalHariEfektifGenap: 90
  };
};
export const updateWeights = async (bobotData: Partial<Bobot>): Promise<void> => {
  const docRef = doc(db, 'bobot', WEIGHTS_DOC_ID).withConverter(bobotConverter);
  await setDoc(docRef, bobotData, { merge: true });
};

// --- Siswa (Student) Service ---
export const addStudent = async (siswa: Omit<Siswa, 'id'>): Promise<Siswa> => {
  const collRef = collection(db, 'siswa').withConverter(siswaConverter);
  const docRef = await addDoc(collRef, siswa);
  return { ...siswa, id: docRef.id };
};
export const getStudents = async (): Promise<Siswa[]> => {
  const collRef = collection(db, 'siswa').withConverter(siswaConverter);
  const q = query(collRef);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};
export const getStudentById = async (id: string): Promise<Siswa | null> => {
  const docRef = doc(db, 'siswa', id).withConverter(siswaConverter);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};
export const updateStudent = async (id: string, siswaData: Partial<Siswa>): Promise<void> => {
  const { id_siswa, ...updatableData } = siswaData;
  const docRef = doc(db, 'siswa', id);
  await updateDoc(docRef, updatableData);
};
export const deleteStudent = async (id: string): Promise<void> => {
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
};
export const updateStudentActivity = async (studentId: string, activity: TugasTambahan, type: 'add' | 'remove'): Promise<void> => {
  const studentRef = doc(db, 'siswa', studentId);
  if (type === 'add') {
    await updateDoc(studentRef, { kegiatan: arrayUnion(activity) });
  } else {
    await updateDoc(studentRef, { kegiatan: arrayRemove(activity) });
  }
};

// --- Nilai (Grade) Service ---
export const addOrUpdateGrade = async (nilai: Omit<Nilai, 'id'>, teacherUid: string, gradeId?: string): Promise<Nilai> => {
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
};

export const getGrade = async (id_siswa: string, semester: number, tahun_ajaran: string, mapel: string, teacherUid: string): Promise<Nilai | null> => {
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
}
export const getGradesByStudent = async (id_siswa: string): Promise<Nilai[]> => {
  const collRef = collection(db, 'nilai').withConverter(nilaiConverter);
  const q = query(collRef,
    where('id_siswa', '==', id_siswa)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};
export const getAllGrades = async (): Promise<Nilai[]> => {
  const collRef = collection(db, 'nilai').withConverter(nilaiConverter);
  const q = query(collRef);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};
export const getGradesForTeacherDisplay = async (
  teacherUid: string,
  mapelList: string[],
  tahunAjaran: string,
  semester: number
): Promise<Nilai[]> => {
  if (mapelList.length === 0 || !teacherUid) return [];

  // Query only by teacherUid to avoid complex indexes.
  const gradesQuery = query(
    collection(db, 'nilai').withConverter(nilaiConverter),
    where('teacherUid', '==', teacherUid)
  );

  const querySnapshot = await getDocs(gradesQuery);
  const allTeacherGrades = querySnapshot.docs.map(doc => doc.data());

  // Filter the rest on the client side.
  return allTeacherGrades.filter(grade =>
    grade.tahun_ajaran === tahunAjaran &&
    grade.semester === semester &&
    mapelList.includes(grade.mapel)
  );
};
export const getUniqueMapelNamesFromGrades = async (assignedMapelList?: string[], teacherUid?: string): Promise<string[]> => {
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
};
export const deleteGradeById = async (gradeId: string): Promise<void> => {
  if (!gradeId) throw new Error("Grade ID is required.");
  await deleteDoc(doc(db, 'nilai', gradeId));
};

// --- User Profile Service ---
export const createUserProfile = async (
  firebaseUser: User, role: Role, displayName?: string,
  assignedMapel?: string[], tugasTambahan?: TugasTambahan[]
): Promise<void> => {
  const userDocRef = doc(db, 'users', firebaseUser.uid).withConverter(userProfileConverter);
  const profile: UserProfile = {
    uid: firebaseUser.uid, email: firebaseUser.email,
    displayName: displayName || firebaseUser.displayName || 'Pengguna Baru',
    role: role, assignedMapel: assignedMapel || [], tugasTambahan: tugasTambahan || [],
    createdAt: serverTimestamp() as Timestamp, updatedAt: serverTimestamp() as Timestamp,
  };
  await setDoc(userDocRef, profile);
};
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userDocRef = doc(db, 'users', uid).withConverter(userProfileConverter);
  const docSnap = await getDoc(userDocRef);
  return docSnap.exists() ? docSnap.data() : null;
};
export const getAllUsersByRole = async (role: Role): Promise<UserProfile[]> => {
  const usersCollRef = collection(db, 'users').withConverter(userProfileConverter);
  const q = query(usersCollRef, where('role', '==', role));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};
export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  const userDocRef = doc(db, 'users', uid).withConverter(userProfileConverter);
  const updateData: any = { ...data, updatedAt: serverTimestamp() };
  if (data.hasOwnProperty('assignedMapel')) updateData.assignedMapel = data.assignedMapel || [];
  if (data.hasOwnProperty('tugasTambahan')) updateData.tugasTambahan = data.tugasTambahan || [];
  delete updateData.uid; delete updateData.email; delete updateData.role; delete updateData.createdAt;
  await updateDoc(userDocRef, updateData);
};
export const deleteUserRecord = async (uid: string): Promise<void> => {
  await deleteDoc(doc(db, 'users', uid));
};

// --- Activity Log Service ---
export const addActivityLog = async (action: string, details?: string, userId?: string, userName?: string): Promise<void> => {
  const collRef = collection(db, 'activity_logs').withConverter(activityLogConverter);
  await addDoc(collRef, { timestamp: serverTimestamp() as Timestamp, action, details, userId, userName });
};
export const getRecentActivityLogs = async (count = 5): Promise<ActivityLog[]> => {
  const collRef = collection(db, 'activity_logs').withConverter(activityLogConverter);
  const q = query(collRef, orderBy('timestamp', 'desc'), limit(count));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

// --- Academic Year Settings Service ---
const ACADEMIC_YEAR_CONFIGS_COLLECTION = 'academicYearConfigs';
export const getAcademicYearSettings = async (): Promise<AcademicYearSetting[]> => {
  const collRef = collection(db, ACADEMIC_YEAR_CONFIGS_COLLECTION).withConverter(academicYearSettingConverter);
  const q = query(collRef);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};
export const setAcademicYearActiveStatus = async (year: string, isActive: boolean): Promise<void> => {
  const docId = year.replace(/\//g, '_');
  const docRef = doc(db, ACADEMIC_YEAR_CONFIGS_COLLECTION, docId).withConverter(academicYearSettingConverter);
  await setDoc(docRef, { year, isActive }, { merge: true });
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
  if (!mapel || !tahun_ajaran) return null;
  const docId = generateKkmDocId(mapel, tahun_ajaran);
  const docRef = doc(db, KKM_SETTINGS_COLLECTION, docId).withConverter(kkmSettingConverter);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};
export const setKkmSetting = async (kkmData: Omit<KkmSetting, 'id' | 'updatedAt'>): Promise<void> => {
  if (!kkmData.mapel || !kkmData.tahun_ajaran) throw new Error("Mapel and Tahun Ajaran are required.");
  const docId = generateKkmDocId(kkmData.mapel, kkmData.tahun_ajaran);
  const docRef = doc(db, KKM_SETTINGS_COLLECTION, docId).withConverter(kkmSettingConverter);
  await setDoc(docRef, kkmData, { merge: true });
};
export const getAllKkmSettings = async (): Promise<KkmSetting[]> => {
  const collRef = collection(db, KKM_SETTINGS_COLLECTION).withConverter(kkmSettingConverter);
  const q = query(collRef, orderBy('mapel', 'asc'), orderBy('tahun_ajaran', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

// --- Mata Pelajaran Master Service ---
const MATA_PELAJARAN_MASTER_COLLECTION = 'mataPelajaranMaster';
export const addMataPelajaranMaster = async (namaMapel: string): Promise<MataPelajaranMaster> => {
  const collRef = collection(db, MATA_PELAJARAN_MASTER_COLLECTION).withConverter(mataPelajaranMasterConverter);
  const q = query(collRef, where("namaMapel", "==", namaMapel));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) throw new Error(`Mata pelajaran "${namaMapel}" sudah ada.`);
  const docRef = await addDoc(collRef, { namaMapel, createdAt: serverTimestamp() } as any);
  return { id: docRef.id, namaMapel, createdAt: Timestamp.now() };
};
export const getMataPelajaranMaster = async (): Promise<MataPelajaranMaster[]> => {
  const collRef = collection(db, MATA_PELAJARAN_MASTER_COLLECTION).withConverter(mataPelajaranMasterConverter);
  const q = query(collRef);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};
export const deleteMataPelajaranMaster = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, MATA_PELAJARAN_MASTER_COLLECTION, id));
};

// --- Pengumuman (Announcement) Service ---
const PENGUMUMAN_COLLECTION = 'pengumuman';
export const addPengumuman = async (data: Omit<Pengumuman, 'id' | 'createdAt'>): Promise<Pengumuman> => {
  const collRef = collection(db, PENGUMUMAN_COLLECTION).withConverter(pengumumanConverter);
  const dataToSave = { ...data, createdAt: serverTimestamp() as Timestamp };
  const docRef = await addDoc(collRef, dataToSave);
  return { ...dataToSave, id: docRef.id, createdAt: Timestamp.now() };
};
export const getPengumumanUntukGuru = async (count = 5): Promise<Pengumuman[]> => {
  const collRef = collection(db, PENGUMUMAN_COLLECTION).withConverter(pengumumanConverter);
  const q = query(collRef, orderBy('createdAt', 'desc'), limit(count));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};
export const getAllPengumuman = async (): Promise<Pengumuman[]> => {
  const collRef = collection(db, PENGUMUMAN_COLLECTION).withConverter(pengumumanConverter);
  const q = query(collRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};
export const deletePengumuman = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, PENGUMUMAN_COLLECTION, id));
};

// --- Teacher Attendance Service (Monthly Rekap by Admin) ---
const TEACHER_ATTENDANCE_COLLECTION = 'teacherAttendance';
export const addOrUpdateTeacherAttendance = async (attendanceData: Omit<TeacherAttendance, 'id' | 'recordedAt' | 'updatedAt'>): Promise<TeacherAttendance> => {
  const collRef = collection(db, TEACHER_ATTENDANCE_COLLECTION).withConverter(teacherAttendanceConverter);
  const docId = `${attendanceData.teacherUid}_${attendanceData.year}_${attendanceData.month}`;
  const docRef = doc(collRef, docId);
  const docSnap = await getDoc(docRef);
  let finalData: TeacherAttendance;
  if (docSnap.exists()) {
    const existingData = docSnap.data();
    finalData = { ...existingData, ...attendanceData, id: docId, updatedAt: serverTimestamp() as Timestamp };
    await updateDoc(docRef, { ...finalData, id: undefined });
  } else {
    finalData = { ...attendanceData, id: docId, recordedAt: serverTimestamp() as Timestamp, updatedAt: serverTimestamp() as Timestamp };
    await setDoc(docRef, { ...finalData, id: undefined });
  }
  const now = Timestamp.now();
  return { ...finalData, recordedAt: finalData.recordedAt instanceof Timestamp ? finalData.recordedAt : now, updatedAt: now };
};
export const getTeacherAttendance = async (teacherUid: string, year: number, month: number): Promise<TeacherAttendance | null> => {
  const docId = `${teacherUid}_${year}_${month}`;
  const docRef = doc(db, TEACHER_ATTENDANCE_COLLECTION, docId).withConverter(teacherAttendanceConverter);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};
export const getAllTeacherAttendanceRecords = async (filters?: { year?: number, month?: number, teacherUid?: string }): Promise<TeacherAttendance[]> => {
  const collRef = collection(db, TEACHER_ATTENDANCE_COLLECTION).withConverter(teacherAttendanceConverter);
  const qConstraints = [];
  if (filters?.year) qConstraints.push(where('year', '==', filters.year));
  if (filters?.month) qConstraints.push(where('month', '==', filters.month));
  if (filters?.teacherUid) qConstraints.push(where('teacherUid', '==', filters.teacherUid));
  if (filters?.year) qConstraints.push(orderBy('month', 'asc'));
  qConstraints.push(orderBy('teacherName', 'asc'));
  const q = query(collRef, ...qConstraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};
export const deleteTeacherAttendance = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, TEACHER_ATTENDANCE_COLLECTION, id));
};

// --- Teacher Daily Attendance Service (Input by Guru) ---
const TEACHER_DAILY_ATTENDANCE_COLLECTION = 'teacherDailyAttendance';
export const addOrUpdateTeacherDailyAttendance = async (attendanceData: Omit<TeacherDailyAttendance, 'id' | 'recordedAt' | 'updatedAt' | 'lastUpdatedByUid'> & { lastUpdatedByUid: string }): Promise<TeacherDailyAttendance> => {
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
};
export const getTeacherDailyAttendanceForDate = async (teacherUid: string, date: Date): Promise<TeacherDailyAttendance | null> => {
  const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const docId = `${teacherUid}_${formattedDate}`;
  const docRef = doc(db, TEACHER_DAILY_ATTENDANCE_COLLECTION, docId).withConverter(teacherDailyAttendanceConverter);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};
export const getTeacherDailyAttendanceForMonth = async (teacherUid: string, year: number, month: number): Promise<TeacherDailyAttendance[]> => {
  const startDate = Timestamp.fromDate(new Date(year, month - 1, 1));
  const endDate = Timestamp.fromDate(new Date(year, month, 0, 23, 59, 59, 999));
  const collRef = collection(db, TEACHER_DAILY_ATTENDANCE_COLLECTION).withConverter(teacherDailyAttendanceConverter);
  const q = query(collRef, where('teacherUid', '==', teacherUid), where('date', '>=', startDate), where('date', '<=', endDate), orderBy('date', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};
export const deleteTeacherDailyAttendance = async (id: string): Promise<void> => {
  if (!id) throw new Error("Document ID is required.");
  await deleteDoc(doc(db, TEACHER_DAILY_ATTENDANCE_COLLECTION, id));
};
export const getAllTeachersDailyAttendanceForPeriod = async (year: number, month?: number | null): Promise<TeacherDailyAttendance[]> => {
  let startDate: Timestamp, endDate: Timestamp;
  if (month && month >= 1 && month <= 12) {
    startDate = Timestamp.fromDate(new Date(year, month - 1, 1));
    endDate = Timestamp.fromDate(new Date(year, month, 0, 23, 59, 59, 999));
  } else {
    startDate = Timestamp.fromDate(new Date(year, 0, 1));
    endDate = Timestamp.fromDate(new Date(year, 11, 31, 23, 59, 59, 999));
  }
  const collRef = collection(db, TEACHER_DAILY_ATTENDANCE_COLLECTION).withConverter(teacherDailyAttendanceConverter);
  // Remove complex ordering to avoid needing a composite index
  const q = query(collRef, where('date', '>=', startDate), where('date', '<=', endDate));
  const querySnapshot = await getDocs(q);
  const records = querySnapshot.docs.map(doc => doc.data());
  // Sort on the client
  return records.sort((a,b) => (b.date?.toDate()?.getTime() || 0) - (a.date?.toDate()?.getTime() || 0));
};

// --- School Profile Service ---
const SCHOOL_CONFIG_COLLECTION = 'schoolConfig';
const SCHOOL_PROFILE_DOC_ID = 'main_profile';
export const getSchoolProfile = async (): Promise<SchoolProfile> => {
    const docRef = doc(db, SCHOOL_CONFIG_COLLECTION, SCHOOL_PROFILE_DOC_ID).withConverter(schoolProfileConverter);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data();
    return {
        id: SCHOOL_PROFILE_DOC_ID,
        stats: { alumni: { ril: 0, dapodik: 0 }, guru: { ril: 0, dapodik: 0 }, tendik: { ril: 0, dapodik: 0 } },
        totalSiswa: 0, classDetails: [], sarana: [],
    };
};
export const updateSchoolProfile = async (profileData: Partial<Omit<SchoolProfile, 'id'>>): Promise<void> => {
    const docRef = doc(db, SCHOOL_CONFIG_COLLECTION, SCHOOL_PROFILE_DOC_ID).withConverter(schoolProfileConverter);
    await setDoc(docRef, profileData, { merge: true });
};


// --- Pelanggaran Siswa (Student Violation) Service ---
const PELANGGARAN_COLLECTION = 'pelanggaran_siswa';

export const addPelanggaran = async (data: Omit<PelanggaranSiswa, 'id' | 'createdAt'>): Promise<PelanggaranSiswa> => {
  const collRef = collection(db, PELANGGARAN_COLLECTION).withConverter(pelanggaranConverter);
  const dataToSave = { ...data, createdAt: serverTimestamp() as Timestamp, updatedAt: serverTimestamp() as Timestamp };
  const docRef = await addDoc(collRef, dataToSave);
  return { ...dataToSave, id: docRef.id, createdAt: Timestamp.now() };
};

export const updatePelanggaran = async (id: string, data: Partial<Omit<PelanggaranSiswa, 'id' | 'createdAt'>>): Promise<void> => {
  const docRef = doc(db, PELANGGARAN_COLLECTION, id);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
};

export const getAllPelanggaran = async (): Promise<PelanggaranSiswa[]> => {
  const collRef = collection(db, PELANGGARAN_COLLECTION).withConverter(pelanggaranConverter);
  const q = query(collRef);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

export const deletePelanggaran = async (pelanggaranId: string): Promise<void> => {
  const docRef = doc(db, PELANGGARAN_COLLECTION, pelanggaranId);
  await deleteDoc(docRef);
};


// --- Laporan Kegiatan Service ---
const LAPORAN_KEGIATAN_COLLECTION = 'laporan_kegiatan';

export const addLaporanKegiatan = async (data: Omit<LaporanKegiatan, 'id' | 'createdAt' | 'updatedAt'>): Promise<LaporanKegiatan> => {
  const collRef = collection(db, LAPORAN_KEGIATAN_COLLECTION).withConverter(laporanKegiatanConverter);
  const dataToSave = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() } as Omit<LaporanKegiatan, 'id'>;
  const docRef = await addDoc(collRef, dataToSave);
  return { ...dataToSave, id: docRef.id, createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
};

export const updateLaporanKegiatan = async (id: string, data: Partial<Omit<LaporanKegiatan, 'id' | 'createdAt' | 'activityId' | 'activityName' | 'createdByUid' | 'createdByDisplayName' >>): Promise<void> => {
  const docRef = doc(db, LAPORAN_KEGIATAN_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const getLaporanKegiatanByActivity = async (activityId: TugasTambahan, userUid: string): Promise<LaporanKegiatan[]> => {
  const collRef = collection(db, LAPORAN_KEGIATAN_COLLECTION).withConverter(laporanKegiatanConverter);
  // Query only by user UID to avoid needing a composite index for gurus.
  const q = query(collRef, where('createdByUid', '==', userUid));
  const querySnapshot = await getDocs(q);
  const allUserReports = querySnapshot.docs.map(doc => doc.data());
  // Filter by activityId on the client side.
  const finalReports = allUserReports.filter(report => report.activityId === activityId);
  return finalReports.sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
};

export const getAllLaporanKegiatan = async (): Promise<LaporanKegiatan[]> => {
  const collRef = collection(db, LAPORAN_KEGIATAN_COLLECTION).withConverter(laporanKegiatanConverter);
  const q = query(collRef, orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

export const deleteLaporanKegiatan = async (laporanId: string): Promise<void> => {
  const docRef = doc(db, LAPORAN_KEGIATAN_COLLECTION, laporanId);
  await deleteDoc(docRef);
};


// --- Agenda Kelas Service ---
const AGENDA_KELAS_COLLECTION = 'agenda_kelas';

export const addOrUpdateAgendaKelas = async (data: Omit<AgendaKelas, 'id' | 'createdAt' | 'updatedAt'>, docIdToUpdate?: string): Promise<AgendaKelas> => {
    const coll = collection(db, AGENDA_KELAS_COLLECTION).withConverter(agendaKelasConverter);
    
    if (docIdToUpdate) {
        // Update existing document
        const docRef = doc(coll, docIdToUpdate);
        await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
        const updatedSnap = await getDoc(docRef);
        return updatedSnap.data() as AgendaKelas;
    } else {
        // Add new document
        const docRef = await addDoc(coll, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        const newSnap = await getDoc(docRef);
        return newSnap.data() as AgendaKelas;
    }
};

export const getAgendasForTeacher = async (teacherUid: string, year: number, month: number): Promise<AgendaKelas[]> => {
    const coll = collection(db, AGENDA_KELAS_COLLECTION).withConverter(agendaKelasConverter);

    const startDate = Timestamp.fromDate(new Date(year, month - 1, 1));
    const endDate = Timestamp.fromDate(new Date(year, month, 0, 23, 59, 59));

    // Query without ordering to avoid composite index requirement.
    const q = query(coll, 
        where('teacherUid', '==', teacherUid),
        where('tanggal', '>=', startDate),
        where('tanggal', '<=', endDate)
    );
    
    const snapshot = await getDocs(q);
    const agendas = snapshot.docs.map(doc => doc.data());

    // Sort on the client side now
    return agendas.sort((a, b) => b.tanggal.toMillis() - a.tanggal.toMillis());
};

export const getAllAgendas = async (): Promise<AgendaKelas[]> => {
    const coll = collection(db, AGENDA_KELAS_COLLECTION).withConverter(agendaKelasConverter);
    // Simplified query to avoid composite index
    const q = query(coll);
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => doc.data());
    // Sort on client
    return data.sort((a,b) => b.tanggal.toMillis() - a.tanggal.toMillis());
};

export const deleteAgenda = async (id: string): Promise<void> => {
    const docRef = doc(db, AGENDA_KELAS_COLLECTION, id);
    await deleteDoc(docRef);
};
