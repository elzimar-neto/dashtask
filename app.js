import * as fb from './firebase-config.js';

let currentUser = null;
let selectedMembers = [];

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
document.getElementById('btn-logout').onclick = () => fb.signOut(fb.auth);

// --- GESTÃO DE GRUPOS ---
window.openGroupModal = () => {
    document.getElementById('modal-group').style.display = 'block';
    selectedMembers = [currentUser.email];
    updateMemberUI();
};

window.closeGroupModal = () => {
    document.getElementById('modal-group').style.display = 'none';
    document.getElementById('group-form').reset();
    document.getElementById('edit-group-id').value = "";
    document.getElementById('btn-delete-group').classList.add('hidden');
};

window.addMemberToList = () => {
    const email = document.getElementById('member-email').value;
    if (email && !selectedMembers.includes(email)) {
        selectedMembers.push(email);
        updateMemberUI();
        document.getElementById('member-email').value = "";
    }
};

function updateMemberUI() {
    document.getElementById('temp-member-list').innerHTML = selectedMembers.map(m => `<li>${m}</li>`).join('');
}

document.getElementById('group-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-group-id').value;
    const groupData = {
        name: document.getElementById('group-name').value,
        owner: currentUser.uid,
        members: selectedMembers,
        updatedAt: fb.serverTimestamp()
    };
    if (id) await fb.updateDoc(fb.doc(fb.db, "groups", id), groupData);
    else await fb.addDoc(fb.collection(fb.db, "groups"), { ...groupData, createdAt: fb.serverTimestamp() });
    closeGroupModal();
};

function loadGroups() {
    const q = fb.query(fb.collection(fb.db, "groups"), fb.where("members", "array-contains", currentUser.email));
    fb.onSnapshot(q, (snapshot) => {
        const list = document.getElementById('groups-list');
        const selector = document.getElementById('team-selector');
        list.innerHTML = "";
        selector.innerHTML = '<option value="personal">Minhas Tarefas</option>';
        snapshot.forEach(doc => {
            const group = doc.data();
            list.innerHTML += `<li onclick="selectTeam('${doc.id}')">${group.name} ${group.owner === currentUser.uid ? `<i class="fas fa-cog" onclick="editGroup('${doc.id}', '${group.name}', ${JSON.stringify(group.members)})"></i>` : ''}</li>`;
            selector.innerHTML += `<option value="${doc.id}">${group.name}</option>`;
        });
    });
}

window.editGroup = (id, name, members) => {
    event.stopPropagation();
    document.getElementById('edit-group-id').value = id;
    document.getElementById('group-name').value = name;
    selectedMembers = members;
    updateMemberUI();
    document.getElementById('btn-delete-group').classList.remove('hidden');
    document.getElementById('modal-group').style.display = 'block';
};

window.deleteCurrentGroup = async () => {
    const id = document.getElementById('edit-group-id').value;
    if(confirm("Excluir este grupo?")) {
        await fb.deleteDoc(fb.doc(fb.db, "groups", id));
        closeGroupModal();
    }
};

// --- GESTÃO DE TAREFAS (CRUD) ---
function startTaskSync() {
    const team = document.getElementById('team-selector').value;
    const q = (team === 'personal') 
        ? fb.query(fb.collection(fb.db, "tasks"), fb.where("teamId", "==", "personal"), fb.where("uid", "==", currentUser.uid))
        : fb.query(fb.collection(fb.db, "tasks"), fb.where("teamId", "==", team));

    fb.onSnapshot(q, (snapshot) => {
        document.querySelectorAll('.task-list').forEach(l => l.innerHTML = "");
        snapshot.forEach(d => renderCard(d.id, d.data()));
    });
}

document.getElementById('task-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-task-id').value;
    const taskData = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-desc').value,
        priority: parseInt(document.querySelector('input[name="priority"]:checked').value),
        deadline: document.getElementById('task-deadline').value,
        teamId: document.getElementById('team-selector').value,
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
        <p style="font-size:12px; color:#666">${data.description}</p>
        <div class="stars">${"★".repeat(data.priority)}</div>
        <small>Prazo: ${data.deadline.split('-').reverse().join('/')}</small>
    `;
    card.ondragstart = (e) => e.dataTransfer.setData('text', e.target.id);
    list.appendChild(card);
}

window.openTaskEdit = (id, data) => {
    document.getElementById('edit-task-id').value = id;
    document.getElementById('task-title').value = data.title;
    document.getElementById('task-desc').value = data.description;
    document.getElementById('task-deadline').value = data.deadline;
    document.querySelector(`input[name="priority"][value="${data.priority}"]`).checked = true;
    document.getElementById('modal-task-title').innerText = "Editar Tarefa";
    document.getElementById('modal-task').style.display = 'block';
};

window.deleteTask = async (id) => { if(confirm("Excluir tarefa?")) await fb.deleteDoc(fb.doc(fb.db, "tasks", id)); };

// Utils Globais
window.openTaskModal = () => {
    document.getElementById('task-form').reset();
    document.getElementById('edit-task-id').value = "";
    document.getElementById('modal-task-title').innerText = "Nova Tarefa";
    document.getElementById('modal-task').style.display = 'block';
};
window.closeModal = () => document.getElementById('modal-task').style.display = 'none';
window.toggleUserMenu = () => document.getElementById('user-menu').classList.toggle('hidden');
window.selectTeam = (id) => { document.getElementById('team-selector').value = id; startTaskSync(); };
window.allowDrop = (e) => e.preventDefault();
window.drop = async (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text');
    const status = e.currentTarget.id;
    await fb.updateDoc(fb.doc(fb.db, "tasks", taskId), { status });
};
document.getElementById('team-selector').onchange = startTaskSync;
