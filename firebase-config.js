import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, query, where, getDocs, 
    onSnapshot, updateDoc, doc, deleteDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Exportação completa para o app.js
export { 
    db, auth, provider, signInWithPopup, signOut, onAuthStateChanged, 
    collection, addDoc, query, where, getDocs, onSnapshot, 
    updateDoc, doc, deleteDoc, serverTimestamp 
};
