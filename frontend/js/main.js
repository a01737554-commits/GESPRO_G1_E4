const API = "http://127.0.0.1:5000";
let draggedTaskId = null;

const STATUS_LABELS = {
  TODO: "TODO",
  IN_PROGRESS: "IN PROGRESS",
  DONE: "DONE"
};

// =============================
// Reset columnas (header + total) y flex para order
// =============================
function resetColumns() {
  document.querySelectorAll(".column").forEach(col => {
    const status = col.dataset.status;

    col.innerHTML = `
      <h3>
        ${STATUS_LABELS[status] || status}
        <span class="column-total" id="total-${status}">0</span>
      </h3>
    `;

    col.style.display = "flex";
    col.style.flexDirection = "column";
    col.style.gap = "8px";

    const header = col.querySelector("h3");
    if (header) header.style.order = "-9999";
  });
}

// =============================
// Crear tarjeta (editar + eliminar)
// =============================
function createTaskCard(t) {
  const taskDiv = document.createElement("div");
  taskDiv.className = "task";
  taskDiv.draggable = true;
  taskDiv.dataset.id = t.id;

  // Orden visual por estimación (10 arriba)
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

  editBtn.addEventListener("mousedown", (e) => e.stopPropagation());
  editBtn.addEventListener("click", async (e) => {
    e.stopPropagation();

    // prompts con valores actuales
    const newTitle = prompt("Nuevo título:", t.titulo);
    if (newTitle === null) return; // cancel

    const newAsignado = prompt("Nuevo asignado a (vacío = sin asignar):", t.asignado_a || "");
    if (newAsignado === null) return;

    const newEst = prompt("Nueva estimación (1-10):", String(t.estimacion));
    if (newEst === null) return;

    // Validación rápida frontend
    const estInt = parseInt(newEst, 10);
    if (!newTitle.trim()) {
      alert("El título no puede estar vacío");
      return;
    }
    if (!Number.isFinite(estInt) || estInt < 1 || estInt > 10) {
      alert("La estimación debe ser un entero entre 1 y 10");
      return;
    }

    // PATCH al backend
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
      alert(err.error || "Error al editar tarea");
      return;
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

  delBtn.addEventListener("mousedown", (e) => e.stopPropagation());
  delBtn.addEventListener("click", async (e) => {
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
async function loadBoard() {
  resetColumns();

  const res = await fetch(`${API}/tasks`);
  const tasks = await res.json();

  const grouped = { TODO: [], IN_PROGRESS: [], DONE: [] };
  const totals = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };

  tasks.forEach(t => {
    const status = t.estado;
    const est = parseInt(t.estimacion, 10);

    if (grouped[status] && Number.isFinite(est)) {
      grouped[status].push({ ...t, estimacion: est });
      totals[status] += est;
    }
  });

  // Orden lógico por estimación (desc)
  Object.keys(grouped).forEach(status => {
    grouped[status].sort((a, b) => b.estimacion - a.estimacion);
  });

  // Render
  Object.keys(grouped).forEach(status => {
    const col = document.querySelector(`.column[data-status="${status}"]`);
    if (!col) return;

    grouped[status].forEach(t => col.appendChild(createTaskCard(t)));
  });

  // Totales
  document.getElementById("total-TODO").textContent = totals.TODO;
  document.getElementById("total-IN_PROGRESS").textContent = totals.IN_PROGRESS;
  document.getElementById("total-DONE").textContent = totals.DONE;
}

// =============================
// Drag & drop
// =============================
document.querySelectorAll(".column").forEach(column => {
  column.addEventListener("dragover", e => e.preventDefault());

  column.addEventListener("drop", async () => {
    if (!draggedTaskId) return;

    await fetch(`${API}/tasks/${draggedTaskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: column.dataset.status })
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

// Inicio
loadBoard();
