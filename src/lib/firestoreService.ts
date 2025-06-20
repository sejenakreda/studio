
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
  arrayUnion
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
    if (nilai.teacherUid) data.teacherUid = nilai.teacherUid;
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
    // UID is the document ID, so it's not stored within the document itself.
    // Firestore automatically manages document IDs.
    const { uid, ...dataToStore } = profile;
    return {
        ...dataToStore, // This will include email, displayName, role, assignedMapel
        email: profile.email, // Ensure email is explicitly included
        displayName: profile.displayName,
        role: profile.role,
        assignedMapel: profile.assignedMapel || [],
        createdAt: profile.createdAt || serverTimestamp(), // Set createdAt if not present
        updatedAt: serverTimestamp(), // Always update updatedAt
    };
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): UserProfile => {
    const data = snapshot.data(options)!;
    // The UID comes from snapshot.id
    const profile: UserProfile = {
      uid: snapshot.id,
      email: data.email || null,
      displayName: data.displayName || null,
      role: data.role as Role, // Assume role is always present and valid per AuthContext logic
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


// --- Bobot Service ---
const WEIGHTS_DOC_ID = 'global_weights';

export const getWeights = async (): Promise<Bobot> => { // Always returns Bobot, defaults if not found
  const docRef = doc(db, 'bobot', WEIGHTS_DOC_ID).withConverter(bobotConverter);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  }
  // Return default if not found
  return {
    id: WEIGHTS_DOC_ID,
    tugas: 20, tes: 20, pts: 20, pas: 25,
    kehadiran: 15,
    eskul: 5,
    osis: 5,
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
export const addOrUpdateGrade = async (nilai: Omit<Nilai, 'id'>, teacherUid: string): Promise<Nilai> => {
  const gradesCollRef = collection(db, 'nilai').withConverter(nilaiConverter);
  const nilaiToSaveWithTeacherUid = { ...nilai, teacherUid };

  const q = query(gradesCollRef,
    where('teacherUid', '==', teacherUid), 
    where('id_siswa', '==', nilaiToSaveWithTeacherUid.id_siswa),
    where('mapel', '==', nilaiToSaveWithTeacherUid.mapel),
    where('semester', '==', nilaiToSaveWithTeacherUid.semester),
    where('tahun_ajaran', '==', nilaiToSaveWithTeacherUid.tahun_ajaran),
    limit(1)
  );
  const querySnapshot = await getDocs(q);

  let docId: string;
  let newCreatedAt = nilaiToSaveWithTeacherUid.createdAt;

  if (!querySnapshot.empty) {
    const existingDoc = querySnapshot.docs[0];
    docId = existingDoc.id;
    if (existingDoc.data().createdAt) {
        newCreatedAt = existingDoc.data().createdAt;
    }
    await updateDoc(existingDoc.ref, { ...nilaiToSaveWithTeacherUid, createdAt: newCreatedAt, updatedAt: serverTimestamp() });
  } else {
    const docRef = await addDoc(gradesCollRef, { ...nilaiToSaveWithTeacherUid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    docId = docRef.id;
    newCreatedAt = Timestamp.now();
  }
  const savedNilai = { ...nilaiToSaveWithTeacherUid, id: docId, createdAt: newCreatedAt } as Nilai;
  return savedNilai;
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
  // This query matches the index suggested by Firebase in the user's error message.
  const q = query(collRef,
                  where('id_siswa', '==', id_siswa),
                  orderBy("tahun_ajaran", "desc"),
                  orderBy("semester", "asc"),
                  orderBy("mapel", "asc")
                  // Firestore will implicitly order by __name__ ASC if needed for tie-breaking with this index.
              );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

export const getAllGrades = async (): Promise<Nilai[]> => {
  const collRef = collection(db, 'nilai').withConverter(nilaiConverter);
  const q = query(collRef, orderBy("updatedAt", "desc")); // Simple sort for admin view
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
  const CHUNK_SIZE = 10; // Firestore 'in' query optimal limit
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
                      where('mapel', 'in', chunk)
                      // orderBy clauses here might require additional complex indexes
                      // depending on the mapelList size and how Firestore handles 'in' with 'orderBy'.
                      // For simplicity and performance, sorting can be done client-side if complex.
                      // However, if consistent sorting from DB is needed:
                      // orderBy("mapel", "asc"), 
                      // orderBy("updatedAt", "desc") // Or by student name, etc.
                    );
      allGradesPromises.push(getDocs(q));
  }
  
  const allGradesSnapshots = await Promise.all(allGradesPromises);
  const combinedGrades: Nilai[] = [];
  allGradesSnapshots.forEach(snapshot => {
    snapshot.docs.forEach(doc => combinedGrades.push(doc.data()));
  });

  // Client-side sort if not handled by Firestore consistently across chunks
  return combinedGrades.sort((a, b) => {
    if (a.mapel.localeCompare(b.mapel) !== 0) {
      return a.mapel.localeCompare(b.mapel);
    }
    // Then by student name if available, otherwise by student ID
    // Assuming student details are enriched later or sorting by ID is acceptable fallback
    const studentAId = a.id_siswa;
    const studentBId = b.id_siswa;
    return studentAId.localeCompare(studentBId);
  });
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
      if (assignedMapelList && assignedMapelList.length > 0) {
        if (assignedMapelList.includes(data.mapel)) {
          mapelSet.add(data.mapel);
        }
      } else if (!teacherUid) { 
        mapelSet.add(data.mapel);
      } else if (teacherUid && (!assignedMapelList || assignedMapelList.length === 0)) {
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

