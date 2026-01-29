const API = "http://127.0.0.1:5000";
let draggedTaskId = null;

const STATUS_LABELS = {
  TODO: "TODO",
  IN_PROGRESS: "IN PROGRESS",
  DONE: "DONE"
};

// =============================
// Reset REAL de columnas
// (y las convierte a flex para poder usar "order")
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

    // 🔒 Fuerza layout flex para que "order" funcione
    col.style.display = "flex";
    col.style.flexDirection = "column";
    col.style.gap = "8px";

    // Header siempre arriba
    const header = col.querySelector("h3");
    if (header) header.style.order = "-9999";
  });
}

// =============================
// Render de una tarjeta
// =============================
function createTaskCard(t) {
  const taskDiv = document.createElement("div");
  taskDiv.className = "task";
  taskDiv.draggable = true;
  taskDiv.dataset.id = t.id;

  // ✅ ORDEN VISUAL: mayor estimación arriba
  // (en flexbox, menor "order" aparece primero)
  taskDiv.style.order = String(1000 - t.estimacion); // 10 => 990, 1 => 999

  const info = document.createElement("div");
  info.className = "task-info";
  info.textContent = `${t.titulo} (${t.asignado_a || "sin asignar"})`;

  const est = document.createElement("div");
  est.className = "estimacion-circle";
  est.textContent = t.estimacion;

  taskDiv.addEventListener("dragstart", () => {
    draggedTaskId = t.id;
  });

  taskDiv.appendChild(info);
  taskDiv.appendChild(est);

  return taskDiv;
}

// =============================
// Cargar tablero (ordena + renderiza)
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
      const task = { ...t, estimacion: est };
      grouped[status].push(task);
      totals[status] += est;
    }
  });

  // ✅ Orden lógico (por si acaso)
  Object.keys(grouped).forEach(status => {
    grouped[status].sort((a, b) => b.estimacion - a.estimacion);
  });

  // Renderizar
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
    loadBoard(); // reordena al mover
  });
});

// =============================
// Crear tarea (y reordenar inmediato)
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
    body: JSON.stringify({
      titulo,
      estimacion,
      asignado_a
    })
  });

  e.target.reset();
  loadBoard(); // ✅ reordena al crear
});

// Inicio
loadBoard();
