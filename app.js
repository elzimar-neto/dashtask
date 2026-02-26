import * as fb from './firebase-config.js';

// Seletores DOM
const modal = document.getElementById('modal-task');
const openModalBtn = document.getElementById('open-modal-btn');
const closeBtn = document.querySelector('.close-btn');
const taskForm = document.getElementById('task-form');
const teamSelector = document.getElementById('team-selector');

// Abrir/Fechar Modal
openModalBtn.onclick = () => modal.style.display = 'block';
closeBtn.onclick = () => modal.style.display = 'none';

// --- Lógica de Dados Real-time ---
function syncTasks() {
    const currentTeam = teamSelector.value;
    const q = fb.query(fb.collection(fb.db, "tasks"), fb.where("teamId", "==", currentTeam));

    fb.onSnapshot(q, (snapshot) => {
        document.querySelectorAll('.drop-zone').forEach(el => el.innerHTML = ""); // Limpa quadros

        snapshot.forEach((doc) => {
            const data = doc.data();
            renderCard(doc.id, data);
        });
    });
}

function renderCard(id, data) {
    const container = document.getElementById(`list-${data.status}`);
    const stars = "★".repeat(data.priority) + "☆".repeat(5 - data.priority);
    
    const card = document.createElement('div');
    card.className = 'task-card';
    card.id = id;
    card.draggable = true;
    card.innerHTML = `
        <button class="del-btn" onclick="deleteTask('${id}')" style="float:right; border:none; background:none; cursor:pointer; color:#ccc;">&times;</button>
        <h4>${data.title}</h4>
        <p>${data.description}</p>
        <div class="stars">${stars}</div>
        <div class="deadline"><i class="far fa-clock"></i> ${data.deadline}</div>
    `;

    // Eventos de Drag no Card
    card.addEventListener('dragstart', e => e.dataTransfer.setData('text', e.target.id));
    container.appendChild(card);
}

// --- Operações Firebase ---
taskForm.onsubmit = async (e) => {
    e.preventDefault();
    const newTask = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-desc').value,
        priority: parseInt(document.querySelector('input[name="priority"]:checked').value),
        deadline: document.getElementById('task-deadline').value,
        status: 'todo',
        teamId: teamSelector.value,
        createdAt: fb.serverTimestamp()
    };

    await fb.addDoc(fb.collection(fb.db, "tasks"), newTask);
    taskForm.reset();
    modal.style.display = 'none';
};

// Configuração das Zonas de Drop
document.querySelectorAll('.drop-zone').forEach(zone => {
    zone.addEventListener('dragover', e => e.preventDefault());
    zone.addEventListener('drop', async (e) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text');
        const newStatus = zone.id.replace('list-', '');
        
        const taskRef = fb.doc(fb.db, "tasks", taskId);
        await fb.updateDoc(taskRef, { status: newStatus });
    });
});

// Deletar Tarefa (Função global para o botão inline)
window.deleteTask = async (id) => {
    if(confirm("Deseja excluir esta tarefa?")) {
        await fb.deleteDoc(fb.doc(fb.db, "tasks", id));
    }
};

// Iniciar
teamSelector.onchange = syncTasks;
syncTasks();