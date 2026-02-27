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
        startTaskSync();
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

// --- GESTÃO DE GRUPOS ---
window.openGroupModal = () => {
    selectedMembers = [currentUser.email];
    updateMemberUI();
    document.getElementById('modal-group-title').innerText = "Novo Grupo";
    document.getElementById('modal-group').style.display = 'block';
};

window.closeGroupModal = () => {
    document.getElementById('modal-group').style.display = 'none';
    document.getElementById('group-form').reset();
    document.getElementById('edit-group-id').value = "";
    document.getElementById('btn-delete-group').classList.add('hidden');
};

window.addMemberToList = () => {
    const email = document.getElementById('member-email').value.trim().toLowerCase();
    if (email && !selectedMembers.includes(email)) {
        selectedMembers.push(email);
        updateMemberUI();
        document.getElementById('member-email').value = "";
    }
};

function updateMemberUI() {
    document.getElementById('temp-member-list').innerHTML = selectedMembers.map(m => `<li>${m}</li>`).join('');
}

function loadGroups() {
    const q = fb.query(fb.collection(fb.db, "groups"), fb.where("members", "array-contains", currentUser.email));
    fb.onSnapshot(q, (snapshot) => {
        const list = document.getElementById('groups-list');
        const selector = document.getElementById('team-selector');
        list.innerHTML = "";
        const currentVal = selector.value;
        selector.innerHTML = '<option value="personal">Minhas Tarefas</option>';
        
        snapshot.forEach(docSnap => {
            const group = docSnap.data();
            const id = docSnap.id;
            const li = document.createElement('li');
            li.innerHTML = `<span onclick="selectTeam('${id}')">${group.name}</span> 
                            ${group.owner === currentUser.uid ? `<i class="fas fa-cog" id="edit-icon-${id}"></i>` : ''}`;
            
            if (group.owner === currentUser.uid) {
                li.querySelector('i').onclick = (e) => {
                    e.stopPropagation();
                    openGroupEdit(id, group.name, group.members);
                };
            }
            list.appendChild(li);
            selector.innerHTML += `<option value="${id}">${group.name}</option>`;
        });
        selector.value = currentVal;
    });
}

function openGroupEdit(id, name, members) {
    document.getElementById('edit-group-id').value = id;
    document.getElementById('group-name').value = name;
    selectedMembers = [...members];
    updateMemberUI();
    document.getElementById('modal-group-title').innerText = "Editar Grupo";
    document.getElementById('btn-delete-group').classList.remove('hidden');
    document.getElementById('modal-group').style.display = 'block';
}

document.getElementById('group-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-group-id').value;
    const data = { name: document.getElementById('group-name').value, members: selectedMembers, owner: currentUser.uid, updatedAt: fb.serverTimestamp() };
    if (id) await fb.updateDoc(fb.doc(fb.db, "groups", id), data);
    else await fb.addDoc(fb.collection(fb.db, "groups"), { ...data, createdAt: fb.serverTimestamp() });
    closeGroupModal();
};

window.deleteCurrentGroup = async () => {
    const id = document.getElementById('edit-group-id').value;
    if (confirm("Excluir grupo e tarefas vinculadas?")) { 
        await fb.deleteDoc(fb.doc(fb.db, "groups", id)); 
        closeGroupModal(); 
        selectTeam('personal');
    }
};

// --- GESTÃO DE TAREFAS (COM ISOLAMENTO) ---
window.selectTeam = (id) => {
    document.getElementById('team-selector').value = id;
    limparQuadros();
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
        limparQuadros();
        snapshot.forEach(d => renderCard(d.id, d.data()));
    }, (err) => {
        console.error("Erro na sincronização:", err);
    });
}

function limparQuadros() {
    document.getElementById('list-todo').innerHTML = "";
    document.getElementById('list-doing').innerHTML = "";
    document.getElementById('list-done').innerHTML = "";
}

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
            <i class="fas fa-edit" id="edit-task-${id}"></i>
            <i class="fas fa-trash" id="del-task-${id}"></i>
        </div>
        <strong>${data.title}</strong>
        <p style="font-size:12px; color:#666">${data.description}</p>
        <div class="stars">${"★".repeat(data.priority)}</div>
        <small>Prazo: ${data.deadline.split('-').reverse().join('/')}</small>
    `;
    card.querySelector(`#edit-task-${id}`).onclick = () => openTaskEdit(id, data);
    card.querySelector(`#del-task-${id}`).onclick = () => deleteTask(id);
    card.ondragstart = (e) => e.dataTransfer.setData('text', e.target.id);
    list.appendChild(card);
}

function openTaskEdit(id, data) {
    document.getElementById('edit-task-id').value = id;
    document.getElementById('task-title').value = data.title;
    document.getElementById('task-desc').value = data.description;
    document.getElementById('task-deadline').value = data.deadline;
    document.querySelector(`input[name="priority"][value="${data.priority}"]`).checked = true;
    document.getElementById('modal-task-title').innerText = "Editar Tarefa";
    document.getElementById('modal-task').style.display = 'block';
}

async function deleteTask(id) {
    if (confirm("Excluir tarefa?")) await fb.deleteDoc(fb.doc(fb.db, "tasks", id));
}

// Drag and Drop
window.allowDrop = (e) => e.preventDefault();
window.drop = async (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text');
    const status = e.currentTarget.id;
    await fb.updateDoc(fb.doc(fb.db, "tasks", taskId), { status });
};

window.openTaskModal = () => {
    document.getElementById('task-form').reset();
    document.getElementById('edit-task-id').value = "";
    document.getElementById('modal-task-title').innerText = "Nova Tarefa";
    document.getElementById('modal-task').style.display = 'block';
};
window.closeModal = () => document.getElementById('modal-task').style.display = 'none';
document.getElementById('team-selector').onchange = startTaskSync;
