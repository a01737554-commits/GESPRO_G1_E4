const API = "http://127.0.0.1:5000";
let draggedTaskId = null;

const DEFAULT_WIP_INPROGRESS = 20;

// =============================
// WIP helpers
// =============================
function getWip() {
  const v = parseInt(localStorage.getItem("wip-IN_PROGRESS"), 10);
  return Number.isFinite(v) ? v : DEFAULT_WIP_INPROGRESS;
}

function setWip(v) {
  localStorage.setItem("wip-IN_PROGRESS", v);
}

function wipWithMargin(base) {
  return Math.ceil(base * 1.10);
}

// =============================
// Crear tarjeta
// =============================
function createTask(task) {
  const div = document.createElement("div");
  div.className = "task";
  div.draggable = true;
  div.dataset.id = task.id;

  // orden por estimación (desc)
  div.style.order = 1000 - task.estimacion;

  div.addEventListener("dragstart", () => {
    draggedTaskId = task.id;
  });

  div.innerHTML = `
    <span class="task-info">${task.titulo} (${task.asignado_a || "sin asignar"})</span>
    <span class="estimacion-circle">${task.estimacion}</span>
  `;

  return div;
}

// =============================
// Cargar tablero
// =============================
let counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };

async function loadBoard() {
  document.querySelectorAll(".task").forEach(t => t.remove());

  const res = await fetch(`${API}/tasks`);
  const tasks = await res.json();

  const grouped = { TODO: [], IN_PROGRESS: [], DONE: [] };
  const totals = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };

  tasks.forEach(t => {
    grouped[t.estado].push(t);
    totals[t.estado] += t.estimacion;
    counts[t.estado]++;
  });

  Object.keys(grouped).forEach(s =>
    grouped[s].sort((a, b) => b.estimacion - a.estimacion)
  );

  Object.keys(grouped).forEach(status => {
    const col = document.querySelector(`.column[data-status="${status}"]`);
    grouped[status].forEach(t => col.appendChild(createTask(t)));
  });

  document.getElementById("total-TODO").textContent = totals.TODO;
  document.getElementById("total-IN_PROGRESS").textContent = totals.IN_PROGRESS;
  document.getElementById("total-DONE").textContent = totals.DONE;

  const base = getWip();
  document.getElementById("wipcount-IN_PROGRESS").textContent =
    `${counts.IN_PROGRESS}/${wipWithMargin(base)}`;
}

// =============================
// Drag & Drop con WIP + 10%
// =============================
document.querySelectorAll(".column").forEach(col => {
  col.addEventListener("dragover", e => e.preventDefault());

  col.addEventListener("drop", async () => {
    if (!draggedTaskId) return;

    if (col.dataset.status === "IN_PROGRESS") {
      const allowed = wipWithMargin(getWip());
      if (counts.IN_PROGRESS >= allowed) {
        alert("WIP límite alcanzado en IN PROGRESS");
        draggedTaskId = null;
        return;
      }
    }

    await fetch(`${API}/tasks/${draggedTaskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: col.dataset.status })
    });

    draggedTaskId = null;
    loadBoard();
  });
});

// =============================
// Crear tarea
// =============================
document.getElementById("task-form").addEventListener("submit", async e => {
  e.preventDefault();

  const titulo = title.value.trim();
  const estimacion = parseInt(estimacion.value, 10);
  const asignado_a = asignado.value.trim();

  if (!titulo || !Number.isFinite(estimacion)) return;

  await fetch(`${API}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo, estimacion, asignado_a })
  });

  e.target.reset();
  loadBoard();
});

// =============================
// Init
// =============================
document.getElementById("wip-IN_PROGRESS").addEventListener("change", e => {
  setWip(parseInt(e.target.value, 10));
  loadBoard();
});

setWip(getWip());
loadBoard();
