import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, updateDoc, doc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBEAd17qKJ1ye2qA8ZpNS8OiUYdwwR9XcY",
  authDomain: "dashtask-b97f7.firebaseapp.com",
  projectId: "dashtask-b97f7",
  storageBucket: "dashtask-b97f7.firebasestorage.app",
  messagingSenderId: "620539650037",
  appId: "1:620539650037:web:83c1ea36579059c9420abc"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, onSnapshot, query, where, updateDoc, doc, deleteDoc, serverTimestamp };