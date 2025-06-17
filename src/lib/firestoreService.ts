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
    delete data.id; // Ensure id is not written to Firestore
    return data;
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Bobot => {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      tugas: data.tugas,
      tes: data.tes,
      pts: data.pts,
      pas: data.pas,
      kehadiran: data.kehadiran,
      eskul: data.eskul,
      osis: data.osis,
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
      kehadiran: data.kehadiran,
      eskul: data.eskul,
      osis: data.osis,
      nilai_akhir: data.nilai_akhir,
      // createdAt: data.createdAt, // Keep Timestamps if needed
      // updatedAt: data.updatedAt,
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
    return docSnap.data();
  }
  // Default weights if not found
  return { tugas: 20, tes: 20, pts: 20, pas: 25, kehadiran: 5, eskul: 5, osis: 5 };
};

export const updateWeights = async (bobot: Bobot): Promise<void> => {
  const docRef = doc(db, 'bobot', WEIGHTS_DOC_ID).withConverter(bobotConverter);
  // Use setDoc with merge:true to create if not exists or update if exists
  await setDoc(docRef, bobot, { merge: true }); 
};


// --- Siswa (Student) Service ---
export const addStudent = async (siswa: Omit<Siswa, 'id'>): Promise<Siswa> => {
  const collRef = collection(db, 'siswa').withConverter(siswaConverter);
  const docRef = await addDoc(collRef, siswa);
  return { ...siswa, id: docRef.id };
};

export const getStudents = async (): Promise<Siswa[]> => {
  const collRef = collection(db, 'siswa').withConverter(siswaConverter);
  const q = query(collRef); // Add ordering if needed: orderBy('nama')
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
  // Consider deleting related grades as well, or handle orphaned grades
  const docRef = doc(db, 'siswa', id);
  await deleteDoc(docRef);
  // TODO: Delete associated grades
  const gradesQuery = query(collection(db, 'nilai'), where('id_siswa', '==', id));
  const gradesSnapshot = await getDocs(gradesQuery);
  const batch = writeBatch(db);
  gradesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
};

// --- Nilai (Grade) Service ---
export const addOrUpdateGrade = async (nilai: Omit<Nilai, 'id' | 'nilai_akhir'>): Promise<Nilai> => {
  // Check if a grade for this student, semester, and year already exists
  const gradesCollRef = collection(db, 'nilai').withConverter(nilaiConverter);
  const q = query(gradesCollRef, 
    where('id_siswa', '==', nilai.id_siswa),
    where('semester', '==', nilai.semester),
    where('tahun_ajaran', '==', nilai.tahun_ajaran)
  );
  const querySnapshot = await getDocs(q);

  let docId: string;
  if (!querySnapshot.empty) {
    // Update existing grade
    const existingDoc = querySnapshot.docs[0];
    docId = existingDoc.id;
    await updateDoc(existingDoc.ref, nilai);
  } else {
    // Add new grade
    const docRef = await addDoc(gradesCollRef, nilai);
    docId = docRef.id;
  }
  return { ...nilai, id: docId };
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
  const q = query(collRef); // Potentially order by tahun_ajaran, semester, etc.
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
  // Note: This does not delete the Firebase Auth user. That must be done separately.
};
