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
  FirestoreDataConverter
} from 'firebase/firestore';
import { db } from './firebase';
import type { Bobot, Siswa, Nilai, UserProfile, Role } from '@/types';
import { UserCredential } from 'firebase/auth';

// Converters
const bobotConverter: FirestoreDataConverter<Bobot> = {
  toFirestore: (bobot: Bobot): DocumentData => {
    const data: any = { ...bobot };
    // Ensure id is not written to Firestore
    // totalHariEfektifGanjil and Genap can be undefined if not set by admin,
    // but Firestore handles undefined by not writing the field, which is fine.
    // Or ensure they are numbers before saving if specific logic is needed.
    if (typeof data.totalHariEfektifGanjil !== 'number') delete data.totalHariEfektifGanjil;
    if (typeof data.totalHariEfektifGenap !== 'number') delete data.totalHariEfektifGenap;
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
      tugas: data.tugas || 0, // Default to 0 if not set
      tes: data.tes || 0,
      pts: data.pts || 0,
      pas: data.pas || 0,
      kehadiran: data.kehadiran || 0, // This is the weight for attendance component
      eskul: data.eskul || 0,
      osis: data.osis || 0,
      totalHariEfektifGanjil: data.totalHariEfektifGanjil, // Keep as undefined if not set
      totalHariEfektifGenap: data.totalHariEfektifGenap,   // Keep as undefined if not set
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
    if(!data.createdAt) data.createdAt = serverTimestamp();
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
      semester: data.semester,
      tahun_ajaran: data.tahun_ajaran,
      tugas: data.tugas || [],
      tes: data.tes,
      pts: data.pts,
      pas: data.pas,
      kehadiran: data.kehadiran, // This is attendance percentage
      eskul: data.eskul,
      osis: data.osis,
      nilai_akhir: data.nilai_akhir,
    };
  }
};

const userProfileConverter: FirestoreDataConverter<UserProfile> = {
  toFirestore: (profile: UserProfile): DocumentData => {
    return {
      uid: profile.uid,
      email: profile.email,
      displayName: profile.displayName,
      role: profile.role,
      createdAt: serverTimestamp(),
    };
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): UserProfile => {
    const data = snapshot.data(options)!;
    return {
      uid: snapshot.id, // uid is the document id
      email: data.email,
      displayName: data.displayName,
      role: data.role,
    };
  }
};


// --- Bobot Service ---
const WEIGHTS_DOC_ID = 'global_weights'; // Single document for weights

export const getWeights = async (): Promise<Bobot | null> => {
  const docRef = doc(db, 'bobot', WEIGHTS_DOC_ID).withConverter(bobotConverter);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    // Provide defaults for new fields if they are undefined from Firestore
    return {
      ...data,
      totalHariEfektifGanjil: typeof data.totalHariEfektifGanjil === 'number' ? data.totalHariEfektifGanjil : 90, // Default 90 days
      totalHariEfektifGenap: typeof data.totalHariEfektifGenap === 'number' ? data.totalHariEfektifGenap : 90,   // Default 90 days
    };
  }
  // Default weights if not found, including new total days fields
  return { 
    tugas: 20, tes: 20, pts: 20, pas: 25, 
    kehadiran: 5, // weight for attendance component
    eskul: 5, osis: 5, 
    totalHariEfektifGanjil: 90, 
    totalHariEfektifGenap: 90 
  };
};

export const updateWeights = async (bobotData: Partial<Bobot>): Promise<void> => {
  const docRef = doc(db, 'bobot', WEIGHTS_DOC_ID).withConverter(bobotConverter);
  // Explicitly cast to Bobot to satisfy converter, even if it's Partial for update
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
  const docRef = doc(db, 'siswa', id).withConverter(siswaConverter);
  await updateDoc(docRef, siswaData);
};

export const deleteStudent = async (id: string): Promise<void> => {
  const docRef = doc(db, 'siswa', id);
  await deleteDoc(docRef);
  const gradesQuery = query(collection(db, 'nilai'), where('id_siswa', '==', id));
  const gradesSnapshot = await getDocs(gradesQuery);
  const batch = writeBatch(db);
  gradesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
};

// --- Nilai (Grade) Service ---
export const addOrUpdateGrade = async (nilai: Omit<Nilai, 'id'>): Promise<Nilai> => {
  const gradesCollRef = collection(db, 'nilai').withConverter(nilaiConverter);
  const q = query(gradesCollRef, 
    where('id_siswa', '==', nilai.id_siswa),
    where('semester', '==', nilai.semester),
    where('tahun_ajaran', '==', nilai.tahun_ajaran)
  );
  const querySnapshot = await getDocs(q);

  let docId: string;
  if (!querySnapshot.empty) {
    const existingDoc = querySnapshot.docs[0];
    docId = existingDoc.id;
    await updateDoc(existingDoc.ref, nilai);
  } else {
    const docRef = await addDoc(gradesCollRef, nilai);
    docId = docRef.id;
  }
  // Cast nilai to Nilai because it's an Omit type
  const savedNilai = { ...nilai, id: docId } as Nilai;
  return savedNilai;
};

export const getGradesByStudent = async (id_siswa: string): Promise<Nilai[]> => {
  const collRef = collection(db, 'nilai').withConverter(nilaiConverter);
  const q = query(collRef, where('id_siswa', '==', id_siswa));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

export const getGrade = async (id_siswa: string, semester: number, tahun_ajaran: string): Promise<Nilai | null> => {
  const gradesCollRef = collection(db, 'nilai').withConverter(nilaiConverter);
  const q = query(gradesCollRef, 
    where('id_siswa', '==', id_siswa),
    where('semester', '==', semester),
    where('tahun_ajaran', '==', tahun_ajaran)
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data();
  }
  return null;
}

export const getAllGrades = async (): Promise<Nilai[]> => {
  const collRef = collection(db, 'nilai').withConverter(nilaiConverter);
  const q = query(collRef); 
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

// --- User Profile Service ---
export const createUserProfile = async (user: UserCredential['user'], role: Role, displayName?: string): Promise<void> => {
  const userDocRef = doc(db, 'users', user.uid).withConverter(userProfileConverter);
  const profile: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: displayName || user.displayName || user.email?.split('@')[0] || 'Pengguna Baru',
    role: role,
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
  await updateDoc(userDocRef, data);
};

export const deleteUserRecord = async (uid: string): Promise<void> => {
  const userDocRef = doc(db, 'users', uid);
  await deleteDoc(userDocRef);
};
