const API = "http://127.0.0.1:5000";
let draggedTaskId = null;

const DEFAULT_WIP_INPROGRESS = 20;

// =============================
// WIP IN_PROGRESS (1–20) + margen 10%
// =============================
function getWip() {
  const v = parseInt(localStorage.getItem("wip-IN_PROGRESS"), 10);
  return Number.isFinite(v) ? v : DEFAULT_WIP_INPROGRESS;
}
function setWip(v) {
  localStorage.setItem("wip-IN_PROGRESS", String(v));
}
function wipAllowed(base) {
  return Math.ceil(base * 1.10);
}

// =============================
// Cargar usuarios desde backend y llenar desplegable
// =============================
async function loadUsers() {
  const select = document.getElementById("asignado");
  if (!select) return;

  select.innerHTML = `<option value="">Sin asignar</option>`;

  const res = await fetch(`${API}/users`);
  const users = await res.json();

  users.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.usuario;
    opt.textContent = `${u.nombre} (${u.usuario})`;
    select.appendChild(opt);
  });
}

// =============================
// Crear tarjeta (orden visual + editar + eliminar)
// =============================
function createTaskCard(t) {
  const taskDiv = document.createElement("div");
  taskDiv.className = "task";
  taskDiv.draggable = true;
  taskDiv.dataset.id = t.id;

  // ✅ orden visual garantizado (10 arriba)
  taskDiv.style.order = String(1000 - t.estimacion);

  const info = document.createElement("div");
  info.className = "task-info";
  info.textContent = `${t.titulo} (${t.asignado_a || "sin asignar"})`;

  const right = document.createElement("div");
  right.style.display = "flex";
  right.style.alignItems = "center";
  right.style.gap = "8px";

  const est = document.createElement("div");
  est.className = "estimacion-circle";
  est.textContent = t.estimacion;

  // ✏️ Editar
  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.textContent = "✏️";
  editBtn.title = "Editar tarea";
  editBtn.style.border = "1px solid #333";
  editBtn.style.background = "white";
  editBtn.style.borderRadius = "6px";
  editBtn.style.cursor = "pointer";
  editBtn.style.padding = "2px 6px";

  editBtn.addEventListener("mousedown", e => e.stopPropagation());
  editBtn.addEventListener("click", async e => {
    e.stopPropagation();

    const newTitle = prompt("Nuevo título:", t.titulo);
    if (newTitle === null) return;

    const newAsignado = prompt("Nuevo asignado a (vacío = sin asignar):", t.asignado_a || "");
    if (newAsignado === null) return;

    const newEst = prompt("Nueva estimación (1-10):", String(t.estimacion));
    if (newEst === null) return;

    const estInt = parseInt(newEst, 10);

    if (!newTitle.trim()) return alert("El título no puede estar vacío");
    if (!Number.isFinite(estInt) || estInt < 1 || estInt > 10) {
      return alert("La estimación debe ser un entero entre 1 y 10");
    }

    const res = await fetch(`${API}/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: newTitle.trim(),
        asignado_a: newAsignado.trim(),
        estimacion: estInt
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Error desconocido" }));
      return alert(err.error || "Error al editar tarea");
    }

    loadBoard();
  });

  // ✖ Eliminar
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.textContent = "✖";
  delBtn.title = "Eliminar tarea";
  delBtn.style.border = "1px solid #333";
  delBtn.style.background = "white";
  delBtn.style.borderRadius = "6px";
  delBtn.style.cursor = "pointer";
  delBtn.style.padding = "2px 6px";
  delBtn.style.fontWeight = "bold";

  delBtn.addEventListener("mousedown", e => e.stopPropagation());
  delBtn.addEventListener("click", async e => {
    e.stopPropagation();
    const ok = confirm("¿Eliminar esta tarea?");
    if (!ok) return;

    await fetch(`${API}/tasks/${t.id}`, { method: "DELETE" });
    loadBoard();
  });

  // Drag
  taskDiv.addEventListener("dragstart", () => {
    draggedTaskId = t.id;
  });

  right.appendChild(est);
  right.appendChild(editBtn);
  right.appendChild(delBtn);

  taskDiv.appendChild(info);
  taskDiv.appendChild(right);

  return taskDiv;
}

// =============================
// Cargar tablero + totales + conteos
// =============================
let counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };

async function loadBoard() {
  // borrar tarjetas existentes
  document.querySelectorAll(".task").forEach(t => t.remove());

  // asegurar flex para order (por si el navegador cambia)
  document.querySelectorAll(".column").forEach(col => {
    col.style.display = "flex";
    col.style.flexDirection = "column";
    col.style.gap = "8px";
    const header = col.querySelector("h3");
    if (header) header.style.order = "-9999";
  });

  const res = await fetch(`${API}/tasks`);
  const tasks = await res.json();

  const grouped = { TODO: [], IN_PROGRESS: [], DONE: [] };
  const totals = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };

  tasks.forEach(t => {
    const est = parseInt(t.estimacion, 10);
    const status = t.estado;

    if (!grouped[status] || !Number.isFinite(est)) return;

    const task = { ...t, estimacion: est };
    grouped[status].push(task);
    totals[status] += est;
    counts[status] += 1;
  });

  // ordenar por estimación desc
  Object.keys(grouped).forEach(s => grouped[s].sort((a, b) => b.estimacion - a.estimacion));

  // render
  Object.keys(grouped).forEach(status => {
    const col = document.querySelector(`.column[data-status="${status}"]`);
    grouped[status].forEach(t => col.appendChild(createTaskCard(t)));
  });

  // totales
  document.getElementById("total-TODO").textContent = totals.TODO;
  document.getElementById("total-IN_PROGRESS").textContent = totals.IN_PROGRESS;
  document.getElementById("total-DONE").textContent = totals.DONE;

  // badge WIP (muestra el límite permitido con margen)
  const base = getWip();
  const allowed = wipAllowed(base);
  document.getElementById("wipcount-IN_PROGRESS").textContent = `${counts.IN_PROGRESS}/${allowed}`;
}

// =============================
// Drag & drop con WIP SOLO en IN_PROGRESS
// =============================
document.querySelectorAll(".column").forEach(col => {
  col.addEventListener("dragover", e => e.preventDefault());

  col.addEventListener("drop", async () => {
    if (!draggedTaskId) return;

    const target = col.dataset.status;

    // bloqueo solo si quieres mover a IN_PROGRESS
    if (target === "IN_PROGRESS") {
      const allowed = wipAllowed(getWip());
      if (counts.IN_PROGRESS >= allowed) {
        alert(`WIP límite alcanzado en IN PROGRESS (${counts.IN_PROGRESS}/${allowed}).`);
        draggedTaskId = null;
        return;
      }
    }

    await fetch(`${API}/tasks/${draggedTaskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: target })
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

  const titulo = document.getElementById("title").value.trim();
  const estimacion = parseInt(document.getElementById("estimacion").value, 10);
  const asignado_a = document.getElementById("asignado").value; // usuario del dropdown

  if (!titulo || !Number.isFinite(estimacion)) return;

  await fetch(`${API}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo, estimacion, asignado_a })
  });

  e.target.reset();
  // recargar usuarios por si cambiaron en el fichero
  loadUsers();
  loadBoard();
});

// =============================
// WIP select (1–20)
// =============================
document.getElementById("wip-IN_PROGRESS").addEventListener("change", e => {
  setWip(parseInt(e.target.value, 10));
  loadBoard();
});

// =============================
// INIT
// =============================
setWip(getWip());
document.getElementById("wip-IN_PROGRESS").value = String(getWip());
loadUsers();
loadBoard();
