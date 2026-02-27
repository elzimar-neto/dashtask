import * as fb from './firebase-config.js';

let currentUser = null;
let selectedMembers = [];
let unsubscribeTasks = null;

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
        startTaskSync(); // Carrega inicial (Pessoal)
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
    }
});

document.getElementById('btn-login-google').onclick = () => fb.signInWithPopup(fb.auth, fb.provider);
document.getElementById('btn-logout-profile').onclick = () => fb.signOut(fb.auth).then(() => window.location.reload());
document.getElementById('profile-trigger').onclick = (e) => {
    e.stopPropagation();
    document.getElementById('user-menu').classList.toggle('hidden');
};
document.addEventListener('click', () => document.getElementById('user-menu').classList.add('hidden'));

// --- LÓGICA DE ÁREA DE TRABALHO (ISOLAMENTO) ---
window.selectTeam = (id, element) => {
    // 1. Visual da Sidebar
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    if (element) element.classList.add('active');
    else if (id === 'personal') document.getElementById('item-personal').classList.add('active');

    // 2. Troca contexto
    document.getElementById('team-selector').value = id;
    
    // 3. Limpa e reinicia
    limparQuadros();
    startTaskSync();
};

function startTaskSync() {
    if (unsubscribeTasks) unsubscribeTasks(); // Desliga o grupo anterior

    const teamId = document.getElementById('team-selector').value;
    let q;

    if (teamId === 'personal') {
        q = fb.query(fb.collection(fb.db, "tasks"), fb.where("teamId", "==", "personal"), fb.where("uid", "==", currentUser.uid));
    } else {
        q = fb.query(fb.collection(fb.db, "tasks"), fb.where("teamId", "==", teamId));
    }

    unsubscribeTasks = fb.onSnapshot(q, (snapshot) => {
        limparQuadros();
        snapshot.forEach(d => renderCard(d.id, d.data()));
    }, (err) => console.error("Erro de sincronização. Verifique os índices no console F12.", err));
}

function limparQuadros() {
    document.getElementById('list-todo').innerHTML = "";
    document.getElementById('list-doing').innerHTML = "";
    document.getElementById('list-done').innerHTML = "";
}

// --- TAREFAS (CRUD) ---
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
    
    if (id) await fb.updateDoc(fb.doc(fb.db, "tasks", id), taskData);
    else await fb.addDoc(fb.collection(fb.db, "tasks"), { ...taskData, status: 'todo', createdAt: new Date().toLocaleDateString('pt-BR') });
    closeModal();
};

function renderCard(id, data) {
    const list = document.getElementById(`list-${data.status}`);
    const card = document.createElement('div');
    card.className = `task-card prio-${data.priority}`;
    card.draggable = true;
    card.id = id;
    card.innerHTML = `
        <div class="card-actions"><i class="fas fa-edit edit-task"></i><i class="fas fa-trash delete-task"></i></div>
        <strong>${data.title}</strong>
        <p style="font-size:12px; color:#666">${data.description}</p>
        <div class="stars">${"★".repeat(data.priority)}</div>
        <small>Prazo: ${data.deadline.split('-').reverse().join('/')}</small>
    `;
    card.querySelector('.edit-task').onclick = () => openTaskEdit(id, data);
    card.querySelector('.delete-task').onclick = () => deleteTask(id);
    card.ondragstart = (e) => e.dataTransfer.setData('text', e.target.id);
    list.appendChild(card);
}

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
            li.className = `sidebar-item ${document.getElementById('team-selector').value === id ? 'active' : ''}`;
            li.innerHTML = `
                <span onclick="selectTeam('${id}', this.parentElement)"><i class="fas fa-users"></i> ${group.name}</span>
                ${group.owner === currentUser.uid ? `<i class="fas fa-cog edit-group" onclick="editGroup('${id}', '${group.name}', ${JSON.stringify(group.members)})"></i>` : ''}
            `;
            list.appendChild(li);
        });
    });
}

// --- UTILITÁRIOS (MODAIS E DRAG) ---
window.openTaskModal = () => { document.getElementById('task-form').reset(); document.getElementById('edit-task-id').value = ""; document.getElementById('modal-task').style.display = 'block'; };
window.closeModal = () => document.getElementById('modal-task').style.display = 'none';
window.openGroupModal = () => { selectedMembers = [currentUser.email]; updateMemberUI(); document.getElementById('modal-group').style.display = 'block'; };
window.closeGroupModal = () => document.getElementById('modal-group').style.display = 'none';
window.addMemberToList = () => { 
    const email = document.getElementById('member-email').value.trim().toLowerCase();
    if (email && !selectedMembers.includes(email)) { selectedMembers.push(email); updateMemberUI(); document.getElementById('member-email').value = ""; }
};
function updateMemberUI() { document.getElementById('temp-member-list').innerHTML = selectedMembers.map(m => `<li>${m}</li>`).join(''); }

window.allowDrop = (e) => e.preventDefault();
window.drop = async (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text');
    const status = e.currentTarget.id;
    await fb.updateDoc(fb.doc(fb.db, "tasks", taskId), { status });
};
