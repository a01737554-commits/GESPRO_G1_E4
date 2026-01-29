const API = "http://127.0.0.1:5000";
let draggedTaskId = null;

// =============================
// CARGAR TABLERO + SUMAS
// =============================
async function loadBoard() {
  // limpiar columnas
  document.querySelectorAll(".column").forEach(col => {
    col.querySelectorAll(".task").forEach(t => t.remove());
  });

  // reiniciar totales
  const totals = {
    TODO: 0,
    IN_PROGRESS: 0,
    DONE: 0
  };

  const res = await fetch(`${API}/tasks`);
  const tasks = await res.json();

  tasks.forEach(t => {
    // acumular estimaciones
    totals[t.estado] += t.estimacion;

    // crear tarjeta
    const taskDiv = document.createElement("div");
    taskDiv.className = "task";
    taskDiv.draggable = true;
    taskDiv.dataset.id = t.id;

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

    document
      .querySelector(`.column[data-status="${t.estado}"]`)
      .appendChild(taskDiv);
  });

  // actualizar círculos de totales
  document.getElementById("total-TODO").textContent = totals.TODO;
  document.getElementById("total-IN_PROGRESS").textContent = totals.IN_PROGRESS;
  document.getElementById("total-DONE").textContent = totals.DONE;
}

// =============================
// DRAG & DROP
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
// CREAR TAREA
// =============================
document.getElementById("task-form").addEventListener("submit", async e => {
  e.preventDefault();

  const titulo = document.getElementById("title").value.trim();
  const estimacion = document.getElementById("estimacion").value;
  const asignado_a = document.getElementById("asignado").value.trim();

  if (!titulo || !estimacion) return;

  await fetch(`${API}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo,
      estimacion: parseInt(estimacion, 10),
      asignado_a
    })
  });

  e.target.reset();
  loadBoard();
});

// =============================
// INICIO
// =============================
loadBoard();
