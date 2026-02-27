import * as fb from './firebase-config.js';

let currentUser = null;
let selectedMembers = [];
let unsubscribeTasks = null;

// --- EXPOSIÇÃO GLOBAL (Para os botões do HTML funcionarem) ---
window.openTaskModal = () => {
    const form = document.getElementById('task-form');
    if(form) form.reset();
    document.getElementById('edit-task-id').value = "";
    document.getElementById('modal-task-title').innerText = "Nova Tarefa";
    document.getElementById('modal-task').style.display = 'block';
};

window.closeModal = () => {
    document.getElementById('modal-task').style.display = 'none';
};

window.openGroupModal = () => {
    if (!currentUser) return alert("Faça login primeiro!");
    selectedMembers = [currentUser.email];
    updateMemberUI();
    document.getElementById('modal-group').style.display = 'block';
};

window.closeGroupModal = () => {
    document.getElementById('modal-group').style.display = 'none';
};

window.toggleUserMenu = (e) => {
    if(e) e.stopPropagation();
    document.getElementById('user-menu').classList.toggle('hidden');
};

// --- AUTENTICAÇÃO ---
fb.onAuthStateChanged(fb.auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        document.getElementById('user-photo').src = user.photoURL;
        document.getElementById('user-full-name').innerText = user.displayName;
        document.getElementById('user-email').innerText = user.email;
        loadGroups();
        startTaskSync();
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
    }
});

document.getElementById('btn-login-google').onclick = () => fb.signInWithPopup(fb.auth, fb.provider);
document.getElementById('btn-logout-profile').onclick = () => fb.signOut(fb.auth).then(() => window.location.reload());

// --- LÓGICA DE WORKSPACE ---
window.selectTeam = (id, element) => {
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    if (element) element.classList.add('active');
    document.getElementById('team-selector').value = id;
    startTaskSync();
};

function startTaskSync() {
    if (unsubscribeTasks) unsubscribeTasks();
    const teamId = document.getElementById('team-selector').value;
    let q;

    if (teamId === 'personal') {
        q = fb.query(fb.collection(fb.db, "tasks"), fb.where("teamId", "==", "personal"), fb.where("uid", "==", currentUser.uid));
    } else {
        q = fb.query(fb.collection(fb.db, "tasks"), fb.where("teamId", "==", teamId));
    }

    unsubscribeTasks = fb.onSnapshot(q, (snapshot) => {
        document.getElementById('list-todo').innerHTML = "";
        document.getElementById('list-doing').innerHTML = "";
        document.getElementById('list-done').innerHTML = "";
        snapshot.forEach(d => renderCard(d.id, d.data()));
    }, (err) => console.error("Erro no Sync:", err));
}

// --- TAREFAS ---
document.getElementById('task-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-task-id').value;
    const teamId = document.getElementById('team-selector').value;
    
    const taskData = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-desc').value,
        priority: parseInt(document.querySelector('input[name="priority"]:checked').value),
        deadline: document.getElementById('task-deadline').value,
        teamId: teamId,
        uid: currentUser.uid,
        author: currentUser.displayName,
        updatedAt: fb.serverTimestamp()
    };
    
    try {
        if (id) await fb.updateDoc(fb.doc(fb.db, "tasks", id), taskData);
        else await fb.addDoc(fb.collection(fb.db, "tasks"), { ...taskData, status: 'todo', createdAt: new Date().toLocaleDateString('pt-BR') });
        window.closeModal();
    } catch (err) { alert("Erro ao salvar: " + err.message); }
};

function renderCard(id, data) {
    const list = document.getElementById(`list-${data.status}`);
    const card = document.createElement('div');
    card.className = `task-card prio-${data.priority}`;
    card.draggable = true;
    card.id = id;
    card.innerHTML = `
        <div class="card-actions">
            <i class="fas fa-edit" onclick="window.openTaskEdit('${id}')"></i>
            <i class="fas fa-trash" onclick="window.deleteTask('${id}')"></i>
        </div>
        <strong>${data.title}</strong>
        <p style="font-size:12px; color:#666">${data.description}</p>
        <div class="stars">${"★".repeat(data.priority)}</div>
        <small>Prazo: ${data.deadline.split('-').reverse().join('/')}</small>
    `;
    card.ondragstart = (e) => e.dataTransfer.setData('text', e.target.id);
    list.appendChild(card);
}

window.openTaskEdit = async (id) => {
    // Busca dados atuais para preencher o modal
    const docRef = fb.doc(fb.db, "tasks", id);
    const snap = await fb.getDocs(fb.query(fb.collection(fb.db, "tasks"), fb.where("__name__", "==", id)));
    snap.forEach(d => {
        const data = d.data();
        document.getElementById('edit-task-id').value = id;
        document.getElementById('task-title').value = data.title;
        document.getElementById('task-desc').value = data.description;
        document.getElementById('task-deadline').value = data.deadline;
        document.querySelector(`input[name="priority"][value="${data.priority}"]`).checked = true;
        document.getElementById('modal-task-title').innerText = "Editar Tarefa";
        document.getElementById('modal-task').style.display = 'block';
    });
};

window.deleteTask = async (id) => {
    if(confirm("Excluir tarefa permanentemente?")) await fb.deleteDoc(fb.doc(fb.db, "tasks", id));
};

// --- GRUPOS ---
function loadGroups() {
    const q = fb.query(fb.collection(fb.db, "groups"), fb.where("members", "array-contains", currentUser.email));
    fb.onSnapshot(q, (snapshot) => {
        const list = document.getElementById('groups-list');
        list.innerHTML = "";
        snapshot.forEach(docSnap => {
            const group = docSnap.data();
            const id = docSnap.id;
            const li = document.createElement('li');
            li.className = "sidebar-item";
            li.innerHTML = `<span onclick="window.selectTeam('${id}', this.parentElement)"><i class="fas fa-users"></i> ${group.name}</span>`;
            list.appendChild(li);
        });
    });
}

// Drag & Drop Nativo
window.allowDrop = (e) => e.preventDefault();
window.drop = async (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text');
    const status = e.currentTarget.id;
    await fb.updateDoc(fb.doc(fb.db, "tasks", taskId), { status });
};
