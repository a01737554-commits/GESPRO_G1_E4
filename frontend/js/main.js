const API = "http://127.0.0.1:5000";
let draggedTaskId = null;

const DEFAULT_WIP_INPROGRESS = 10;

// =============================
// WIP IN_PROGRESS: leer/guardar
// =============================
function getWipInProgress() {
  const saved = localStorage.getItem("wip-IN_PROGRESS");
  const val = saved ? parseInt(saved, 10) : DEFAULT_WIP_INPROGRESS;
  return Number.isFinite(val) ? val : DEFAULT_WIP_INPROGRESS;
}

function setWipInProgress(val) {
  localStorage.setItem("wip-IN_PROGRESS", String(val));
}

function wireWipSelect() {
  const sel = document.getElementById("wip-IN_PROGRESS");
  if (!sel) return;

  sel.value = String(getWipInProgress());

  sel.addEventListener("change", () => {
    const v = parseInt(sel.value, 10);
    setWipInProgress(v);
    loadBoard(); // actualiza badge
  });
}

// =============================
// Crear tarjeta (con orden visual)
// =============================
function createTaskCard(t) {
  const taskDiv = document.createElement("div");
  taskDiv.className = "task";
  taskDiv.draggable = true;
  taskDiv.dataset.id = t.id;

  // orden visual por estimación (10 arriba)
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
// Cargar tablero
// =============================
let lastCounts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };

async function loadBoard() {
  // limpiar tareas (sin tocar headers)
  document.querySelectorAll(".column").forEach(col => {
    col.querySelectorAll(".task").forEach(t => t.remove());
    // flex para que "order" funcione
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
  const counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };

  tasks.forEach(t => {
    const status = t.estado;
    const est = parseInt(t.estimacion, 10);

    if (grouped[status] && Number.isFinite(est)) {
      grouped[status].push({ ...t, estimacion: est });
      totals[status] += est;
      counts[status] += 1;
    }
  });

  lastCounts = counts;

  // ordenar por estimación desc
  Object.keys(grouped).forEach(status => {
    grouped[status].sort((a, b) => b.estimacion - a.estimacion);
  });

  // render
  Object.keys(grouped).forEach(status => {
    const col = document.querySelector(`.column[data-status="${status}"]`);
    if (!col) return;
    grouped[status].forEach(t => col.appendChild(createTaskCard(t)));
  });

  // totales
  document.getElementById("total-TODO").textContent = totals.TODO;
  document.getElementById("total-IN_PROGRESS").textContent = totals.IN_PROGRESS;
  document.getElementById("total-DONE").textContent = totals.DONE;

  // badge WIP solo IN_PROGRESS
  const lim = getWipInProgress();
  const badge = document.getElementById("wipcount-IN_PROGRESS");
  if (badge) badge.textContent = `${counts.IN_PROGRESS}/${lim}`;
}

// =============================
// Drag & drop con bloqueo SOLO hacia IN_PROGRESS
// =============================
document.querySelectorAll(".column").forEach(column => {
  column.addEventListener("dragover", e => e.preventDefault());

  column.addEventListener("drop", async () => {
    if (!draggedTaskId) return;

    const targetStatus = column.dataset.status;

    // 🚫 WIP solo si intentas soltar en IN_PROGRESS
    if (targetStatus === "IN_PROGRESS") {
      const limit = getWipInProgress();
      const current = lastCounts.IN_PROGRESS ?? 0;

      if (current >= limit) {
        draggedTaskId = null;
        alert(`WIP límite alcanzado en IN PROGRESS (${current}/${limit}).`);
        return;
      }
    }

    await fetch(`${API}/tasks/${draggedTaskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: targetStatus })
    });

    draggedTaskId = null;
    loadBoard();
  });
});

// =============================
// Crear tarea (SIN WIP en TODO)
// =============================
document.getElementById("task-form").addEventListener("submit", async e => {
  e.preventDefault();

  const titulo = document.getElementById("title").value.trim();
  const estimacion = parseInt(document.getElementById("estimacion").value, 10);
  const asignado_a = document.getElementById("asignado").value.trim();

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
// INICIO
// =============================
wireWipSelect();
loadBoard();
