
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
import { db } from './firebase';
import type { Bobot, Siswa, Nilai, UserProfile, Role, ActivityLog, AcademicYearSetting, KkmSetting, MataPelajaranMaster, Pengumuman, PrioritasPengumuman, TeacherAttendance, TeacherDailyAttendance, TeacherDailyAttendanceStatus, SchoolProfile, ClassDetail, SaranaDetail, SchoolStats } from '@/types';
import { User } from 'firebase/auth';
import { getCurrentAcademicYear } from './utils';


// Converters
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
    return data;
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
    };
  }
};

const nilaiConverter: FirestoreDataConverter<Nilai> = {
  toFirestore: (nilai: Nilai): DocumentData => {
    const data: any = { ...nilai }; // Spread all properties first
    delete data.id; // Remove client-side ID

    // Ensure createdAt is set if not provided (for new documents)
    // If nilai.createdAt is already a Timestamp (e.g., from an existing doc being updated), it will be used.
    // If nilai.createdAt is undefined (new doc), serverTimestamp() is used.
    data.createdAt = nilai.createdAt instanceof Timestamp ? nilai.createdAt : serverTimestamp();
    
    // Always set/update updatedAt
    data.updatedAt = serverTimestamp();
    
    // teacherUid is part of Nilai type and should be passed, so it's already in `data` from the spread.
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
    // Ensure all fields are present, providing defaults for optional ones if necessary
    return {
      teacherUid: attendance.teacherUid,
      teacherName: attendance.teacherName || 'Guru',
      date: attendance.date, // Should be a Firestore Timestamp
      status: attendance.status,
      notes: attendance.notes || '',
      recordedAt: attendance.recordedAt || serverTimestamp(), // Initial record time
      updatedAt: serverTimestamp(), // Always update this on write
      lastUpdatedByUid: attendance.lastUpdatedByUid || attendance.teacherUid, // Defaults to teacher who made it
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


// --- Bobot Service ---
const WEIGHTS_DOC_ID = 'global_weights';

export const getWeights = async (): Promise<Bobot> => {
  const docRef = doc(db, 'bobot', WEIGHTS_DOC_ID).withConverter(bobotConverter);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  }
  // Return default weights if not found in Firestore
  return {
    id: WEIGHTS_DOC_ID,
    tugas: 20, tes: 20, pts: 20, pas: 25,
    kehadiran: 15, eskul: 5, osis: 5,
    totalHariEfektifGanjil: 90, totalHariEfektifGenap: 90
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
  const q = query(collRef, orderBy("nama", "asc"));
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
  const docRef = doc(db, 'siswa', id).withConverter(siswaConverter);
  await updateDoc(docRef, updatableData);
};

export const deleteStudent = async (id: string): Promise<void> => {
  const docRef = doc(db, 'siswa', id);
  const studentSnapshot = await getDoc(doc(db, 'siswa', id).withConverter(siswaConverter));
  if (!studentSnapshot.exists()) {
    console.warn("Siswa dengan ID (dokumen) " + id + " tidak ditemukan untuk dihapus.");
    return;
  }
  const studentData = studentSnapshot.data();
  if (!studentData) {
      console.warn("Data siswa tidak valid untuk ID (dokumen) " + id);
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
  console.log("Siswa dengan id_siswa " + studentSpecificId + " dan nilai terkait telah dihapus.");
};

// --- Nilai (Grade) Service ---
export const addOrUpdateGrade = async (nilai: Omit<Nilai, 'id'>, teacherUid: string): Promise<Nilai> => {
  const gradesCollRef = collection(db, 'nilai').withConverter(nilaiConverter);
  // Ensure teacherUid from the authenticated session is part of the object to be saved/queried
  const nilaiToProcess = { ...nilai, teacherUid };

  const q = query(gradesCollRef,
    where('teacherUid', '==', teacherUid), // Query with the authenticated teacher's UID
    where('id_siswa', '==', nilaiToProcess.id_siswa),
    where('mapel', '==', nilaiToProcess.mapel),
    where('semester', '==', nilaiToProcess.semester),
    where('tahun_ajaran', '==', nilaiToProcess.tahun_ajaran),
    limit(1)
  );
  const querySnapshot = await getDocs(q);

  let docId: string;
  let finalSavedNilai: Nilai;

  if (!querySnapshot.empty) {
    const existingDoc = querySnapshot.docs[0];
    docId = existingDoc.id;
    const existingData = existingDoc.data();
    
    // Prepare data for update, ensuring original createdAt is preserved.
    // The converter will handle serverTimestamp for updatedAt.
    // All other fields from nilaiToProcess (which includes latest teacherUid) will be used.
    const dataForUpdate: Nilai = {
        ...nilaiToProcess, // Includes latest values and teacherUid
        id: docId, // Not used by toFirestore but good for local consistency
        createdAt: existingData.createdAt, // Preserve original createdAt
    };
    await updateDoc(existingDoc.ref, dataForUpdate);
    finalSavedNilai = { ...dataForUpdate, updatedAt: Timestamp.now() }; // Simulate updatedAt for return value
  } else {
    // For a new document, createdAt will be handled by the converter (sets serverTimestamp if not present).
    // Spread nilaiToProcess to ensure all fields, including teacherUid, are passed.
    const dataForAdd: Omit<Nilai, 'id'> = {
        ...nilaiToProcess,
        // `createdAt` can be omitted, converter will set serverTimestamp()
        // `updatedAt` will be set by converter
    };
    const docRef = await addDoc(gradesCollRef, dataForAdd as Nilai); // Cast as Nilai for converter
    docId = docRef.id;
    // Simulate timestamps for immediate return
    finalSavedNilai = { ...dataForAdd, id: docId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as Nilai;
  }
  return finalSavedNilai;
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
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data();
  }
  return null;
}

export const getGradesByStudent = async (id_siswa: string): Promise<Nilai[]> => {
  const collRef = collection(db, 'nilai').withConverter(nilaiConverter);
  const q = query(collRef,
                  where('id_siswa', '==', id_siswa),
                  orderBy("tahun_ajaran", "desc"),
                  orderBy("semester", "asc"),
                  orderBy("mapel", "asc")
              );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

export const getAllGrades = async (): Promise<Nilai[]> => {
  const collRef = collection(db, 'nilai').withConverter(nilaiConverter);
  const q = query(collRef, orderBy("updatedAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

export const getGradesForTeacherDisplay = async (
  teacherUid: string,
  mapelList: string[],
  tahunAjaran: string,
  semester: number
): Promise<Nilai[]> => {
  if (mapelList.length === 0) return [];

  const mapelChunks: string[][] = [];
  const CHUNK_SIZE = 30; // Firestore 'in' query optimal limit
  for (let i = 0; i < mapelList.length; i += CHUNK_SIZE) {
      mapelChunks.push(mapelList.slice(i, i + CHUNK_SIZE));
  }

  const allGradesPromises: Promise<QuerySnapshot<Nilai>>[] = [];

  for (const chunk of mapelChunks) {
      const collRef = collection(db, 'nilai').withConverter(nilaiConverter);
      const q = query(collRef,
                      where('teacherUid', '==', teacherUid),
                      where('tahun_ajaran', '==', tahunAjaran),
                      where('semester', '==', semester),
                      where('mapel', 'in', chunk),
                      orderBy("mapel", "asc"),
                      orderBy("updatedAt", "desc")
                    );
      allGradesPromises.push(getDocs(q));
  }

  const allGradesSnapshots = await Promise.all(allGradesPromises);
  const combinedGrades: Nilai[] = [];
  allGradesSnapshots.forEach(snapshot => {
    snapshot.docs.forEach(doc => combinedGrades.push(doc.data()));
  });
  return combinedGrades;
};

export const getUniqueMapelNamesFromGrades = async (assignedMapelList?: string[], teacherUid?: string): Promise<string[]> => {
  const gradesCollRef = collection(db, 'nilai');
  const qConstraints = [];

  if (teacherUid) {
    qConstraints.push(where('teacherUid', '==', teacherUid));
  }

  const q = query(gradesCollRef, ...qConstraints);
  const querySnapshot = await getDocs(q);
  const mapelSet = new Set<string>();

  querySnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.mapel && typeof data.mapel === 'string') {
      // If it's for a specific teacher (teacherUid provided)
      if (teacherUid) {
        // And if that teacher has an assignedMapelList, only include mapel from that list
        if (assignedMapelList && assignedMapelList.length > 0) {
          if (assignedMapelList.includes(data.mapel)) {
            mapelSet.add(data.mapel);
          }
        } else {
          // If teacherUid is provided but no assignedMapelList (or it's empty),
          // include any mapel associated with their grades.
          mapelSet.add(data.mapel);
        }
      } else {
        // If no teacherUid (e.g., admin fetching all unique mapel), add all mapel.
        mapelSet.add(data.mapel);
      }
    }
  });
  return Array.from(mapelSet).sort();
};


export const deleteGradeById = async (gradeId: string): Promise<void> => {
  if (!gradeId) {
    throw new Error("Grade ID is required for deletion.");
  }
  const gradeDocRef = doc(db, 'nilai', gradeId);
  await deleteDoc(gradeDocRef);
};


// --- User Profile Service ---
export const createUserProfile = async (
  firebaseUser: User,
  role: Role,
  displayName?: string,
  assignedMapel?: string[]
): Promise<void> => {
  const userDocRef = doc(db, 'users', firebaseUser.uid).withConverter(userProfileConverter);
  const profile: UserProfile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Pengguna Baru',
    role: role,
    assignedMapel: assignedMapel || [],
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
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
  const q = query(usersCollRef, where('role', '==', role), orderBy("displayName", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  const userDocRef = doc(db, 'users', uid).withConverter(userProfileConverter);
  const updateData: any = { ...data, updatedAt: serverTimestamp() };
  if (data.hasOwnProperty('assignedMapel')) {
    updateData.assignedMapel = Array.isArray(data.assignedMapel) ? data.assignedMapel : [];
  }
  delete updateData.uid;
  delete updateData.email;
  delete updateData.role;
  delete updateData.createdAt;
  await updateDoc(userDocRef, updateData);
};


export const deleteUserRecord = async (uid: string): Promise<void> => {
  const userDocRef = doc(db, 'users', uid);
  await deleteDoc(userDocRef);
};

// --- Activity Log Service ---
export const addActivityLog = async (
  action: string,
  details?: string,
  userId?: string,
  userName?: string
): Promise<void> => {
  const collRef = collection(db, 'activity_logs').withConverter(activityLogConverter);
  const logEntry: Omit<ActivityLog, 'id'> = {
    timestamp: serverTimestamp() as Timestamp,
    action,
    details,
    userId,
    userName,
  };
  await addDoc(collRef, logEntry);
};

export const getRecentActivityLogs = async (count: number = 5): Promise<ActivityLog[]> => {
  const collRef = collection(db, 'activity_logs').withConverter(activityLogConverter);
  const q = query(collRef, orderBy('timestamp', 'desc'), limit(count));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

// --- Academic Year Settings Service ---
const ACADEMIC_YEAR_CONFIGS_COLLECTION = 'academicYearConfigs';

export const getAcademicYearSettings = async (): Promise<AcademicYearSetting[]> => {
  const collRef = collection(db, ACADEMIC_YEAR_CONFIGS_COLLECTION).withConverter(academicYearSettingConverter);
  const q = query(collRef, orderBy("year", "desc"));
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
  const activeYears = settings
    .filter(setting => setting.isActive)
    .map(setting => setting.year)
    .sort((a, b) => b.localeCompare(a));

  if (activeYears.length === 0) {
    return [getCurrentAcademicYear()];
  }
  return activeYears;
};

// --- KKM Settings Service ---
const KKM_SETTINGS_COLLECTION = 'kkm_settings';

const generateKkmDocId = (mapel: string, tahun_ajaran: string): string => {
  return "" + mapel.toLowerCase().replace(/[^a-z0-9]/gi, '_') + "_" + tahun_ajaran.replace('/', '-');
};

export const getKkmSetting = async (mapel: string, tahun_ajaran: string): Promise<KkmSetting | null> => {
  if (!mapel || !tahun_ajaran) return null;
  const docId = generateKkmDocId(mapel, tahun_ajaran);
  const docRef = doc(db, KKM_SETTINGS_COLLECTION, docId).withConverter(kkmSettingConverter);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};

export const setKkmSetting = async (kkmData: Omit<KkmSetting, 'id' | 'updatedAt'>): Promise<void> => {
  if (!kkmData.mapel || !kkmData.tahun_ajaran) {
    throw new Error("Mapel and Tahun Ajaran are required to set KKM.");
  }
  const docId = generateKkmDocId(kkmData.mapel, kkmData.tahun_ajaran);
  const docRef = doc(db, KKM_SETTINGS_COLLECTION, docId).withConverter(kkmSettingConverter);
  await setDoc(docRef, kkmData, { merge: true });
};

// --- Mata Pelajaran Master Service ---
const MATA_PELAJARAN_MASTER_COLLECTION = 'mataPelajaranMaster';

export const addMataPelajaranMaster = async (namaMapel: string): Promise<MataPelajaranMaster> => {
  const collRef = collection(db, MATA_PELAJARAN_MASTER_COLLECTION).withConverter(mataPelajaranMasterConverter);
  const q = query(collRef, where("namaMapel", "==", namaMapel));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error("Mata pelajaran \"" + namaMapel + "\" sudah ada.");
  }
  const docRef = await addDoc(collRef, { namaMapel, createdAt: serverTimestamp() } as Omit<MataPelajaranMaster, 'id' | 'createdAt'> & { createdAt: Timestamp });
  return { id: docRef.id, namaMapel, createdAt: Timestamp.now() };
};

export const getMataPelajaranMaster = async (): Promise<MataPelajaranMaster[]> => {
  const collRef = collection(db, MATA_PELAJARAN_MASTER_COLLECTION).withConverter(mataPelajaranMasterConverter);
  const q = query(collRef, orderBy("namaMapel", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

export const deleteMataPelajaranMaster = async (id: string): Promise<void> => {
  const docRef = doc(db, MATA_PELAJARAN_MASTER_COLLECTION, id);
  await deleteDoc(docRef);
};

// --- Pengumuman (Announcement) Service ---
const PENGUMUMAN_COLLECTION = 'pengumuman';

export const addPengumuman = async (
  data: Omit<Pengumuman, 'id' | 'createdAt'>
): Promise<Pengumuman> => {
  const collRef = collection(db, PENGUMUMAN_COLLECTION).withConverter(pengumumanConverter);
  const dataToSave = {
    ...data,
    createdAt: serverTimestamp() as Timestamp,
  };
  const docRef = await addDoc(collRef, dataToSave);
  return { ...dataToSave, id: docRef.id, createdAt: Timestamp.now() };
};

export const getPengumumanUntukGuru = async (count: number = 5): Promise<Pengumuman[]> => {
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
  const docRef = doc(db, PENGUMUMAN_COLLECTION, id);
  await deleteDoc(docRef);
};

// --- Teacher Attendance Service (Monthly Rekap by Admin) ---
const TEACHER_ATTENDANCE_COLLECTION = 'teacherAttendance'; // Rekap bulanan oleh Admin

export const addOrUpdateTeacherAttendance = async (
  attendanceData: Omit<TeacherAttendance, 'id' | 'recordedAt' | 'updatedAt'>
): Promise<TeacherAttendance> => {
  const collRef = collection(db, TEACHER_ATTENDANCE_COLLECTION).withConverter(teacherAttendanceConverter);

  const docId = `${attendanceData.teacherUid}_${attendanceData.year}_${attendanceData.month}`;
  const docRef = doc(collRef, docId);
  const docSnap = await getDoc(docRef);

  let finalData: TeacherAttendance;

  if (docSnap.exists()) {
    const existingData = docSnap.data();
    finalData = {
      ...existingData,
      ...attendanceData,
      id: docId,
      updatedAt: serverTimestamp() as Timestamp,
    };
    await updateDoc(docRef, { ...finalData, id: undefined });
  } else {
    finalData = {
      ...attendanceData,
      id: docId,
      recordedAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };
    await setDoc(docRef, { ...finalData, id: undefined });
  }
  const now = Timestamp.now();
  return {
    ...finalData,
    recordedAt: finalData.recordedAt instanceof Timestamp ? finalData.recordedAt : now,
    updatedAt: now,
  };
};

export const getTeacherAttendance = async (
  teacherUid: string,
  year: number,
  month: number
): Promise<TeacherAttendance | null> => {
  const docId = `${teacherUid}_${year}_${month}`;
  const docRef = doc(db, TEACHER_ATTENDANCE_COLLECTION, docId).withConverter(teacherAttendanceConverter);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};

export const getAllTeacherAttendanceRecords = async (
  filters?: { year?: number, month?: number, teacherUid?: string }
): Promise<TeacherAttendance[]> => {
  const collRef = collection(db, TEACHER_ATTENDANCE_COLLECTION).withConverter(teacherAttendanceConverter);
  const queryConstraints = [];
  if (filters?.year) queryConstraints.push(where('year', '==', filters.year));
  if (filters?.month) queryConstraints.push(where('month', '==', filters.month));
  if (filters?.teacherUid) queryConstraints.push(where('teacherUid', '==', filters.teacherUid));

  if (filters?.year) queryConstraints.push(orderBy('month', 'asc'));
  queryConstraints.push(orderBy('teacherName', 'asc'));

  const q = query(collRef, ...queryConstraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

export const deleteTeacherAttendance = async (id: string): Promise<void> => {
    const docRef = doc(db, TEACHER_ATTENDANCE_COLLECTION, id);
    await deleteDoc(docRef);
};

// --- Teacher Daily Attendance Service (Input by Guru) ---
const TEACHER_DAILY_ATTENDANCE_COLLECTION = 'teacherDailyAttendance';

export const addOrUpdateTeacherDailyAttendance = async (
  attendanceData: Omit<TeacherDailyAttendance, 'id' | 'recordedAt' | 'updatedAt' | 'lastUpdatedByUid'> & { lastUpdatedByUid: string }
): Promise<TeacherDailyAttendance> => {
  const { teacherUid, date, teacherName } = attendanceData;

  const dateObj = date.toDate(); // Ensure date is a JS Date object before formatting
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1; // JS months are 0-indexed
  const day = dateObj.getDate();
  const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const docId = `${teacherUid}_${formattedDate}`;

  const docRef = doc(db, TEACHER_DAILY_ATTENDANCE_COLLECTION, docId).withConverter(teacherDailyAttendanceConverter);
  const docSnap = await getDoc(docRef);

  let dataToSave: TeacherDailyAttendance;

  if (docSnap.exists()) {
    // Update existing record
    const existingData = docSnap.data();
    dataToSave = {
      ...existingData, // Preserve existing fields like original recordedAt
      ...attendanceData, // Apply new changes (status, notes, lastUpdatedByUid)
      id: docId, // Not stored in Firestore, but useful for the return type
      updatedAt: serverTimestamp() as Timestamp, // Always update this
      lastUpdatedByUid: attendanceData.lastUpdatedByUid, // User performing the update
    };
  } else {
    // Create new record
    dataToSave = {
      ...attendanceData,
      id: docId, // Not stored in Firestore
      teacherName: teacherName || 'Guru', // Default if not provided
      recordedAt: serverTimestamp() as Timestamp, // Set initial record time
      updatedAt: serverTimestamp() as Timestamp,
      lastUpdatedByUid: attendanceData.lastUpdatedByUid,
    };
  }

  // Remove id before saving to Firestore as it's the document key
  const { id, ...firestoreData } = dataToSave;
  await setDoc(docRef, firestoreData, { merge: true }); // Use set with merge for both create and update

  // Simulate server timestamps for immediate UI update if needed
  const now = Timestamp.now();
  return {
    ...dataToSave,
    // If it's an update, recordedAt comes from existingData, otherwise it's now (simulated)
    recordedAt: dataToSave.recordedAt instanceof Timestamp ? dataToSave.recordedAt : (docSnap.exists() ? docSnap.data().recordedAt : now),
    updatedAt: now
  };
};


export const getTeacherDailyAttendanceForDate = async (
  teacherUid: string,
  date: Date
): Promise<TeacherDailyAttendance | null> => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const docId = `${teacherUid}_${formattedDate}`;

  const docRef = doc(db, TEACHER_DAILY_ATTENDANCE_COLLECTION, docId).withConverter(teacherDailyAttendanceConverter);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};

export const getTeacherDailyAttendanceForMonth = async (
  teacherUid: string,
  year: number,
  month: number // 1-12
): Promise<TeacherDailyAttendance[]> => {
  const startDate = Timestamp.fromDate(new Date(year, month - 1, 1));
  // End of the month needs to be precise for correct range
  const endDate = Timestamp.fromDate(new Date(year, month, 0, 23, 59, 59, 999));


  const collRef = collection(db, TEACHER_DAILY_ATTENDANCE_COLLECTION).withConverter(teacherDailyAttendanceConverter);
  const q = query(
    collRef,
    where('teacherUid', '==', teacherUid),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'asc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

export const deleteTeacherDailyAttendance = async (id: string): Promise<void> => {
  if (!id) throw new Error("Document ID is required for deletion.");
  const docRef = doc(db, TEACHER_DAILY_ATTENDANCE_COLLECTION, id);
  await deleteDoc(docRef);
};

// Used by Admin to fetch daily records across all teachers for a specific period (e.g., a month)
export const getAllTeachersDailyAttendanceForPeriod = async (
  year: number,
  month?: number | null // 1-12, or null/undefined for whole year
): Promise<TeacherDailyAttendance[]> => {
  let startDate: Timestamp;
  let endDate: Timestamp;

  if (month && month >= 1 && month <= 12) {
    startDate = Timestamp.fromDate(new Date(year, month - 1, 1, 0, 0, 0, 0)); // Start of the first day of the month
    endDate = Timestamp.fromDate(new Date(year, month, 0, 23, 59, 59, 999)); // End of the last day of the month
  } else { // Whole year
    startDate = Timestamp.fromDate(new Date(year, 0, 1, 0, 0, 0, 0)); // Jan 1st, start of day
    endDate = Timestamp.fromDate(new Date(year, 11, 31, 23, 59, 59, 999)); // Dec 31st, end of day
  }

  const collRef = collection(db, TEACHER_DAILY_ATTENDANCE_COLLECTION).withConverter(teacherDailyAttendanceConverter);
  const q = query(
    collRef,
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'asc'), // Ensure date is the first orderBy for range queries
    orderBy('teacherName', 'asc') // Then order by teacherName
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

// --- School Profile Service ---
const SCHOOL_CONFIG_COLLECTION = 'schoolConfig';
const SCHOOL_PROFILE_DOC_ID = 'main_profile';

export const getSchoolProfile = async (): Promise<SchoolProfile> => {
    const docRef = doc(db, SCHOOL_CONFIG_COLLECTION, SCHOOL_PROFILE_DOC_ID).withConverter(schoolProfileConverter);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data();
    }
    // Return default empty profile if not found
    return {
        id: SCHOOL_PROFILE_DOC_ID,
        stats: {
          alumni: { ril: 0, dapodik: 0 },
          guru: { ril: 0, dapodik: 0 },
          tendik: { ril: 0, dapodik: 0 },
        },
        totalSiswa: 0,
        classDetails: [],
        sarana: [],
    };
};

export const updateSchoolProfile = async (profileData: Partial<Omit<SchoolProfile, 'id'>>): Promise<void> => {
    const docRef = doc(db, SCHOOL_CONFIG_COLLECTION, SCHOOL_PROFILE_DOC_ID).withConverter(schoolProfileConverter);
    // The converter will handle adding the `updatedAt` server timestamp
    await setDoc(docRef, profileData, { merge: true });
};
