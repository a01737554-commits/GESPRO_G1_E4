const API_URL = "http://127.0.0.1:5000";

const form = document.getElementById("task-form");
const inputTitle = document.getElementById("task-title");
const selectEstimacion = document.getElementById("task-estimacion");
const inputAsignado = document.getElementById("task-asignado");
const selectEstado = document.getElementById("task-estado");

const list = document.getElementById("task-list");
const errorP = document.getElementById("error");

async function cargarTareas() {
  errorP.textContent = "";
  list.innerHTML = "";

  const res = await fetch(`${API_URL}/tasks`);
  const tasks = await res.json();

  tasks.forEach((t) => {
    const li = document.createElement("li");
    li.textContent = `${t.titulo} | ${t.estado} | Est: ${t.estimacion} | ${t.asignado_a || "sin asignar"}`;
    list.appendChild(li);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorP.textContent = "";

  const titulo = inputTitle.value.trim();
  const estimacion = selectEstimacion.value;
  const asignado_a = inputAsignado.value.trim();
  const estado = selectEstado.value;

  if (!estimacion) {
    errorP.textContent = "Debes seleccionar una estimación entre 1 y 10";
    return;
  }

  const res = await fetch(`${API_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo,
      estimacion: parseInt(estimacion, 10),
      asignado_a,
      estado
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error desconocido" }));
    errorP.textContent = err.error || "Error al crear tarea";
    return;
  }

  form.reset();
  await cargarTareas();
});

cargarTareas();