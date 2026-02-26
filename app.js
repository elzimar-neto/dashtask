import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, updateDoc, doc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Suas credenciais oficiais
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

let currentUser = null;

// Observador de Autenticação
onAuthStateChanged(auth, (user) => {
    const loginBtn = document.getElementById('btn-login');
    const userProfile = document.getElementById('user-profile');
    
    if (user) {
        currentUser = user;
        loginBtn.classList.add('hidden');
        userProfile.classList.remove('hidden');
        document.getElementById('user-name').innerText = user.displayName.split(' ')[0];
        document.getElementById('user-photo').src = user.photoURL;
        startSync();
    } else {
        currentUser = null;
        loginBtn.classList.remove('hidden');
        userProfile.classList.add('hidden');
        limparQuadros();
    }
});

document.getElementById('btn-login').onclick = () => signInWithPopup(auth, provider);
document.getElementById('btn-logout').onclick = () => signOut(auth);

// Sincronização Real-time
function startSync() {
    if (!currentUser) return;
    const team = document.getElementById('team-selector').value;
    
    const q = (team === 'personal') 
        ? query(collection(db, "tasks"), where("teamId", "==", "personal"), where("uid", "==", currentUser.uid))
        : query(collection(db, "tasks"), where("teamId", "==", team));

    onSnapshot(q, (snapshot) => {
        limparQuadros();
        snapshot.forEach(d => renderCard(d.id, d.data()));
    });
}

// Salvar Tarefa
document.getElementById('task-form').onsubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Logue para salvar!");

    const newTask = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-desc').value,
        priority: parseInt(document.querySelector('input[name="priority"]:checked').value),
        deadline: document.getElementById('task-deadline').value,
        status: 'todo',
        teamId: document.getElementById('team-selector').value,
        uid: currentUser.uid,
        author: currentUser.displayName,
        createdAt: serverTimestamp()
    };

    await addDoc(collection(db, "tasks"), newTask);
    closeModal();
    e.target.reset();
};

function renderCard(id, data) {
    const list = document.getElementById(`list-${data.status}`);
    const stars = "★".repeat(data.priority) + "☆".repeat(5 - data.priority);
    
    const card = document.createElement('div');
    card.className = `task-card prio-${data.priority}`;
    card.draggable = true;
    card.id = id;
    card.innerHTML = `
        <div style="display:flex; justify-content:space-between;">
            <strong>${data.title}</strong>
            <span onclick="deleteTask('${id}')" style="cursor:pointer; color:#ccc;">&times;</span>
        </div>
        <p style="font-size:0.8em; color:#666;">${data.description}</p>
        <div class="stars">${stars}</div>
        <div style="font-size:0.7em; color:#888;">
            <i class="fas fa-calendar"></i> ${data.deadline}
        </div>
    `;

    card.addEventListener('dragstart', e => e.dataTransfer.setData('text', e.target.id));
    list.appendChild(card);
}

// Drag and Drop
window.allowDrop = (e) => e.preventDefault();
window.drop = async (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text');
    const newStatus = e.currentTarget.id;
    await updateDoc(doc(db, "tasks", id), { status: newStatus });
};

window.deleteTask = async (id) => {
    if(confirm("Deseja apagar esta tarefa?")) await deleteDoc(doc(db, "tasks", id));
};

function limparQuadros() {
    document.querySelectorAll('.task-list').forEach(l => l.innerHTML = "");
}

// Globais para o HTML
window.openModal = () => document.getElementById('modal-task').style.display = 'block';
window.closeModal = () => document.getElementById('modal-task').style.display = 'none';
document.getElementById('team-selector').onchange = startSync;
