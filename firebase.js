import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBd2NU7zYpkbe4CbFs_hPEmutKJhZyaLQw",
  authDomain: "tae-vm2026.firebaseapp.com",
  projectId: "tae-vm2026",
  storageBucket: "tae-vm2026.firebasestorage.app",
  messagingSenderId: "922497387865",
  appId: "1:922497387865:web:5fa6080198501938d0d048",
  measurementId: "G-YBPMZY3K8B"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const tournamentRef = doc(db, "tournament", "main");

export async function testFirebaseConnection() {
  await setDoc(
    doc(db, "test", "connection"),
    {
      message: "Firebase connection works!",
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  alert("🔥 Firebase connected successfully!");
}

export async function loadTournamentData() {
  const snapshot = await getDoc(tournamentRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data();
}

export async function saveTournamentData(data) {
  await setDoc(
    tournamentRef,
    {
      ...data,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}
