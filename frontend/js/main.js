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
// Crear tarjeta (con botón eliminar)
// =============================
function createTaskCard(t) {
  const taskDiv = document.createElement("div");
  taskDiv.className = "task";
  taskDiv.draggable = true;
  taskDiv.dataset.id = t.id;

  // Orden visual: mayor estimación arriba
  taskDiv.style.order = String(1000 - t.estimacion);

  // contenedor izquierdo (titulo y asignado)
  const info = document.createElement("div");
  info.className = "task-info";
  info.textContent = `${t.titulo} (${t.asignado_a || "sin asignar"})`;

  // contenedor derecho (estimación + delete)
  const right = document.createElement("div");
  right.style.display = "flex";
  right.style.alignItems = "center";
  right.style.gap = "8px";

  const est = document.createElement("div");
  est.className = "estimacion-circle";
  est.textContent = t.estimacion;

  // botón eliminar
  const del = document.createElement("button");
  del.type = "button";
  del.textContent = "✖";
  del.title = "Eliminar tarea";
  del.style.border = "1px solid #333";
  del.style.background = "white";
  del.style.borderRadius = "6px";
  del.style.cursor = "pointer";
  del.style.padding = "2px 6px";
  del.style.fontWeight = "bold";

  // Evita que el drag se dispare al dar click en borrar
  del.addEventListener("mousedown", (e) => e.stopPropagation());
  del.addEventListener("click", async (e) => {
    e.stopPropagation();

    const ok = confirm("¿Eliminar esta tarea?");
    if (!ok) return;

    await fetch(`${API}/tasks/${t.id}`, { method: "DELETE" });
    loadBoard();
  });

  taskDiv.addEventListener("dragstart", () => {
    draggedTaskId = t.id;
  });

  right.appendChild(est);
  right.appendChild(del);

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

  // Orden lógico
  Object.keys(grouped).forEach(status => {
    grouped[status].sort((a, b) => b.estimacion - a.estimacion);
  });

  // Render (order también asegura visual)
  Object.keys(grouped).forEach(status => {
    const col = document.querySelector(`.column[data-status="${status}"]`);
    if (!col) return;

    grouped[status].forEach(t => {
      col.appendChild(createTaskCard(t));
    });
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
