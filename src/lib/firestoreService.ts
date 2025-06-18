
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
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import type { Bobot, Siswa, Nilai, UserProfile, Role, ActivityLog, AcademicYearSetting, KkmSetting, MataPelajaranMaster, Pengumuman, PrioritasPengumuman } from '@/types';
import { User } from 'firebase/auth'; 
import { getCurrentAcademicYear } from './utils';


// Converters
const bobotConverter: FirestoreDataConverter<Bobot> = {
  toFirestore: (bobot: Bobot): DocumentData => {
    const data: any = { ...bobot };
    delete data.id; 
    return data;
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
    const data: any = { ...nilai };
    delete data.id; 
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
    return {
      uid: snapshot.id, 
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      assignedMapel: data.assignedMapel || [], 
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
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


// --- Bobot Service ---
const WEIGHTS_DOC_ID = 'global_weights';

export const getWeights = async (): Promise<Bobot | null> => {
  const docRef = doc(db, 'bobot', WEIGHTS_DOC_ID).withConverter(bobotConverter);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return { 
    tugas: 20, tes: 20, pts: 20, pas: 25, 
    kehadiran: 15, // total 100
    eskul: 5, // Max bonus points
    osis: 5,  // Max bonus points
    totalHariEfektifGanjil: 90, totalHariEfektifGenap: 90 
  }; 
};

export const updateWeights = async (bobotData: Partial<Bobot>): Promise<void> => {
  const docRef = doc(db, 'bobot', WEIGHTS_DOC_ID).withConverter(bobotConverter);
  await setDoc(docRef, bobotData as Bobot, { merge: true }); 
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
export const addOrUpdateGrade = async (nilai: Omit<Nilai, 'id'>): Promise<Nilai> => {
  const gradesCollRef = collection(db, 'nilai').withConverter(nilaiConverter);
  const q = query(gradesCollRef, 
    where('id_siswa', '==', nilai.id_siswa),
    where('mapel', '==', nilai.mapel),
    where('semester', '==', nilai.semester),
    where('tahun_ajaran', '==', nilai.tahun_ajaran)
  );
  const querySnapshot = await getDocs(q);

  let docId: string;
  let newCreatedAt = nilai.createdAt; 

  if (!querySnapshot.empty) {
    const existingDoc = querySnapshot.docs[0];
    docId = existingDoc.id;
    if (existingDoc.data().createdAt) { 
        newCreatedAt = existingDoc.data().createdAt;
    }
    await updateDoc(existingDoc.ref, { ...nilai, createdAt: newCreatedAt, updatedAt: serverTimestamp() });
  } else {
    const docRef = await addDoc(gradesCollRef, { ...nilai, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    docId = docRef.id;
    newCreatedAt = Timestamp.now(); 
  }
  const savedNilai = { ...nilai, id: docId, createdAt: newCreatedAt } as Nilai; 
  return savedNilai;
};

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

export const getGrade = async (id_siswa: string, semester: number, tahun_ajaran: string, mapel: string): Promise<Nilai | null> => {
  const gradesCollRef = collection(db, 'nilai').withConverter(nilaiConverter);
  const q = query(gradesCollRef, 
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

export const getAllGrades = async (): Promise<Nilai[]> => {
  const collRef = collection(db, 'nilai').withConverter(nilaiConverter);
  const q = query(collRef, orderBy("updatedAt", "desc")); 
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

export const getUniqueMapelNamesFromGrades = async (): Promise<string[]> => {
  const gradesCollRef = collection(db, 'nilai'); 
  const querySnapshot = await getDocs(gradesCollRef);
  const mapelSet = new Set<string>();
  querySnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.mapel && typeof data.mapel === 'string') {
      mapelSet.add(data.mapel);
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
  assignedMapel?: string[] // New parameter
): Promise<void> => {
  const userDocRef = doc(db, 'users', firebaseUser.uid).withConverter(userProfileConverter);
  const profile: UserProfile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Pengguna Baru',
    role: role,
    assignedMapel: assignedMapel || [], // Use provided or default to empty array
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
  const updateData = {
    ...data,
    assignedMapel: data.assignedMapel || [], 
    updatedAt: serverTimestamp()
  };
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
  return { ...dataToSave, id: docRef.id, createdAt: Timestamp.now() }; // Return with ID and resolved timestamp
};

export const getPengumumanUntukGuru = async (count: number = 5): Promise<Pengumuman[]> => {
  const collRef = collection(db, PENGUMUMAN_COLLECTION).withConverter(pengumumanConverter);
  // Currently, all announcements are for gurus. Filter by role if needed in future.
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
