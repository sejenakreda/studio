
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
import type { Bobot, Siswa, Nilai, UserProfile, Role, ActivityLog } from '@/types';
import { User, UserCredential } from 'firebase/auth';

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
    delete data.id; // Jangan simpan ID dokumen Firestore di dalam dokumen itu sendiri
    // Set timestamps
    if (!data.createdAt) { // Hanya set createdAt jika belum ada (untuk pembuatan baru)
        data.createdAt = serverTimestamp();
    }
    data.updatedAt = serverTimestamp(); // Selalu perbarui updatedAt
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
      createdAt: data.createdAt, // Pastikan ada field ini di Firestore
      updatedAt: data.updatedAt, // Pastikan ada field ini di Firestore
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
      createdAt: serverTimestamp(), // Tambahkan createdAt untuk profil pengguna jika belum ada
    };
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): UserProfile => {
    const data = snapshot.data(options)!;
    return {
      uid: snapshot.id, // uid adalah ID dokumen
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      // createdAt: data.createdAt, // Bisa ditambahkan jika diperlukan
    };
  }
};

const activityLogConverter: FirestoreDataConverter<ActivityLog> = {
  toFirestore: (log: Omit<ActivityLog, 'id'>): DocumentData => {
    return {
      timestamp: log.timestamp, // Ini akan menjadi serverTimestamp() saat dikirim dari addActivityLog
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
      timestamp: data.timestamp, // Ini akan menjadi objek Timestamp dari Firestore
      action: data.action,
      details: data.details,
      userId: data.userId,
      userName: data.userName,
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
  // Return default weights if not found, or handle as error / return null
  return { 
    tugas: 20, tes: 20, pts: 20, pas: 25, 
    kehadiran: 5, eskul: 5, osis: 5, 
    totalHariEfektifGanjil: 90, totalHariEfektifGenap: 90 
  }; // Default values
};

export const updateWeights = async (bobotData: Partial<Bobot>): Promise<void> => {
  const docRef = doc(db, 'bobot', WEIGHTS_DOC_ID).withConverter(bobotConverter);
  // Gunakan setDoc dengan merge true untuk membuat dokumen jika belum ada, atau update jika sudah ada
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
  // Pastikan id_siswa tidak diupdate jika ada di siswaData
  const { id_siswa, ...updatableData } = siswaData;
  const docRef = doc(db, 'siswa', id).withConverter(siswaConverter);
  await updateDoc(docRef, updatableData);
};

export const deleteStudent = async (id: string): Promise<void> => {
  const docRef = doc(db, 'siswa', id);

  // Ambil data siswa untuk mendapatkan id_siswa sebelum menghapus
  const studentSnapshot = await getDoc(doc(db, 'siswa', id).withConverter(siswaConverter));
  if (!studentSnapshot.exists()) {
    console.warn(`Siswa dengan ID (dokumen) ${id} tidak ditemukan untuk dihapus.`);
    return; // Keluar jika siswa tidak ditemukan
  }
  const studentData = studentSnapshot.data();
  const studentSpecificId = studentData.id_siswa; // Ini adalah 'id_siswa' yang unik

  // Hapus dokumen siswa
  await deleteDoc(docRef); 

  // Hapus semua nilai yang terkait dengan id_siswa tersebut
  const gradesQuery = query(collection(db, 'nilai'), where('id_siswa', '==', studentSpecificId));
  const gradesSnapshot = await getDocs(gradesQuery);
  const batch = writeBatch(db);
  gradesSnapshot.docs.forEach(nilaiDoc => batch.delete(nilaiDoc.ref));
  await batch.commit();
  console.log(`Siswa dengan id_siswa ${studentSpecificId} dan nilai terkait telah dihapus.`);
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
  let newCreatedAt = nilai.createdAt; // Pertahankan createdAt jika sudah ada

  if (!querySnapshot.empty) {
    // Update existing grade
    const existingDoc = querySnapshot.docs[0];
    docId = existingDoc.id;
    if (existingDoc.data().createdAt) { // Pertahankan createdAt asli jika sudah ada
        newCreatedAt = existingDoc.data().createdAt;
    }
    await updateDoc(existingDoc.ref, { ...nilai, createdAt: newCreatedAt, updatedAt: serverTimestamp() });
  } else {
    // Add new grade
    const docRef = await addDoc(gradesCollRef, { ...nilai, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    docId = docRef.id;
    newCreatedAt = Timestamp.now(); // timestamp perkiraan untuk sisi client
  }
  const savedNilai = { ...nilai, id: docId, createdAt: newCreatedAt } as Nilai; // cast karena TS mungkin tidak tahu nilai akhir ada
  return savedNilai;
};

export const getGradesByStudent = async (id_siswa: string): Promise<Nilai[]> => {
  const collRef = collection(db, 'nilai').withConverter(nilaiConverter);
  // Urutkan berdasarkan tahun ajaran lalu semester untuk konsistensi
  const q = query(collRef, where('id_siswa', '==', id_siswa), orderBy("tahun_ajaran", "desc"), orderBy("semester", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

export const getGrade = async (id_siswa: string, semester: number, tahun_ajaran: string): Promise<Nilai | null> => {
  const gradesCollRef = collection(db, 'nilai').withConverter(nilaiConverter);
  const q = query(gradesCollRef, 
    where('id_siswa', '==', id_siswa),
    where('semester', '==', semester),
    where('tahun_ajaran', '==', tahun_ajaran),
    limit(1) // Hanya satu nilai yang diharapkan per kombinasi ini
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data();
  }
  return null;
}

export const getAllGrades = async (): Promise<Nilai[]> => {
  const collRef = collection(db, 'nilai').withConverter(nilaiConverter);
  // Urutkan berdasarkan kapan terakhir diupdate untuk melihat data terbaru di atas secara default
  const q = query(collRef, orderBy("updatedAt", "desc")); 
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

// --- User Profile Service ---
export const createUserProfile = async (firebaseUser: User, role: Role, displayName?: string): Promise<void> => {
  const userDocRef = doc(db, 'users', firebaseUser.uid).withConverter(userProfileConverter);
  const profile: UserProfile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Pengguna Baru',
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
  const q = query(usersCollRef, where('role', '==', role), orderBy("displayName", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  const userDocRef = doc(db, 'users', uid).withConverter(userProfileConverter);
  await updateDoc(userDocRef, data);
};

export const deleteUserRecord = async (uid: string): Promise<void> => {
  // Note: This only deletes the Firestore profile. Authentication user must be deleted separately.
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
    timestamp: serverTimestamp() as Timestamp, // Cast serverTimestamp to Timestamp for the type
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

    