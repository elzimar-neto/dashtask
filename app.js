import * as fb from './firebase-config.js';

let currentUser = null;
let selectedMembers = [];
let unsubscribeTasks = null; // ESSENCIAL: Controla a conexão com o banco

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
        startTaskSync(); // Inicia com o pessoal
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
    }
});

document.getElementById('btn-login-google').onclick = () => fb.signInWithPopup(fb.auth, fb.provider);
document.getElementById('btn-logout-profile').onclick = () => fb.signOut(fb.auth).then(() => window.location.reload());

// --- LÓGICA DE WORKSPACE (ISOLAMENTO) ---
window.selectTeam = (id, element) => {
    // 1. Atualiza visual da sidebar
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    if(element) element.classList.add('active');

    // 2. Troca o ID no seletor oculto
    document.getElementById('team-selector').value = id;

    // 3. Reinicia a sincronização
    limparQuadros();
    startTaskSync();
};

function startTaskSync() {
    if (unsubscribeTasks) unsubscribeTasks(); // Desliga o grupo anterior

    const teamId = document.getElementById('team-selector').value;
    let q;

    if (teamId === 'personal') {
        q = fb.query(fb.collection(fb.db, "tasks"), 
            fb.where("teamId", "==", "personal"), 
            fb.where("uid", "==", currentUser.uid));
    } else {
        q = fb.query(fb.collection(fb.db, "tasks"), 
            fb.where("teamId", "==", teamId));
    }

    unsubscribeTasks = fb.onSnapshot(q, (snapshot) => {
        limparQuadros();
        snapshot.forEach(d => renderCard(d.id, d.data()));
    }, (err) => {
        console.error("Erro: Provavelmente falta criar o índice no Firebase console.", err);
    });
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
        <div class="card-actions">
            <i class="fas fa-edit" onclick="openTaskEdit('${id}', ${JSON.stringify(data).replace(/"/g, '&quot;')})"></i>
            <i class="fas fa-trash" onclick="deleteTask('${id}')"></i>
        </div>
        <strong>${data.title}</strong>
        <p>${data.description}</p>
        <div class="stars">${"★".repeat(data.priority)}</div>
        <small>Fim: ${data.deadline.split('-').reverse().join('/')}</small>
    `;
    card.ondragstart = (e) => e.dataTransfer.setData('text', e.target.id);
    list.appendChild(card);
}

// --- GESTÃO DE GRUPOS ---
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
            li.innerHTML = `
                <span onclick="selectTeam('${id}', this.parentElement)"><i class="fas fa-users"></i> ${group.name}</span>
                ${group.owner === currentUser.uid ? `<i class="fas fa-cog" onclick="editGroup('${id}', '${group.name}', ${JSON.stringify(group.members)})"></i>` : ''}
            `;
            list.appendChild(li);
        });
    });
}

// ... Restante das funções auxiliares (closeModal, openTaskModal, etc) ...
window.openTaskModal = () => { document.getElementById('task-form').reset(); document.getElementById('edit-task-id').value = ""; document.getElementById('modal-task').style.display = 'block'; };
window.closeModal = () => document.getElementById('modal-task').style.display = 'none';
window.openGroupModal = () => { selectedMembers = [currentUser.email]; updateMemberUI(); document.getElementById('modal-group').style.display = 'block'; };
window.closeGroupModal = () => { document.getElementById('modal-group').style.display = 'none'; document.getElementById('group-form').reset(); };
window.addMemberToList = () => { 
    const email = document.getElementById('member-email').value.trim().toLowerCase();
    if (email && !selectedMembers.includes(email)) { selectedMembers.push(email); updateMemberUI(); document.getElementById('member-email').value = ""; }
};
function updateMemberUI() { document.getElementById('temp-member-list').innerHTML = selectedMembers.map(m => `<li>${m}</li>`).join(''); }

document.getElementById('group-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = { name: document.getElementById('group-name').value, members: selectedMembers, owner: currentUser.uid, updatedAt: fb.serverTimestamp() };
    await fb.addDoc(fb.collection(fb.db, "groups"), { ...data, createdAt: fb.serverTimestamp() });
    closeGroupModal();
};

window.drop = async (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text');
    const status = e.currentTarget.id;
    await fb.updateDoc(fb.doc(fb.db, "tasks", taskId), { status });
};
window.allowDrop = (e) => e.preventDefault();
window.deleteTask = async (id) => { if(confirm("Excluir?")) await fb.deleteDoc(fb.doc(fb.db, "tasks", id)); };
window.openTaskEdit = (id, data) => {
    document.getElementById('edit-task-id').value = id;
    document.getElementById('task-title').value = data.title;
    document.getElementById('task-desc').value = data.description;
    document.getElementById('task-deadline').value = data.deadline;
    document.querySelector(`input[name="priority"][value="${data.priority}"]`).checked = true;
    document.getElementById('modal-task').style.display = 'block';
};
