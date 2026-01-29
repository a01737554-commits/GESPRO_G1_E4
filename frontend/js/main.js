const API_URL = "http://127.0.0.1:5000";

const form = document.getElementById("task-form");
const inputTitle = document.getElementById("task-title");
const inputEstimacion = document.getElementById("task-estimacion");
const inputAsignado = document.getElementById("task-asignado");
const selectEstado = document.getElementById("task-estado");

const list = document.getElementById("task-list");
const errorP = document.getElementById("error");

function formatoEstimacion(e) {
  if (e === null || e === undefined || e === "") return "sin estimación";
  return `${e}`;
}

function formatoAsignado(a) {
  if (!a) return "sin asignar";
  return a;
}

async function cargarTareas() {
  errorP.textContent = "";
  list.innerHTML = "";

  const res = await fetch(`${API_URL}/tasks`);
  const tasks = await res.json();

  tasks.forEach((t) => {
    const li = document.createElement("li");
    li.textContent = `${t.titulo} | ${t.estado} | Est: ${formatoEstimacion(t.estimacion)} | Asig: ${formatoAsignado(t.asignado_a)}`;
    list.appendChild(li);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorP.textContent = "";

  const titulo = inputTitle.value.trim();
  const asignado_a = inputAsignado.value.trim();
  const estado = selectEstado.value;

  // OJO: input type number devuelve string si lo lees con .value
  const estimacion = inputEstimacion.value; // puede ser "" si no puso nada

  const res = await fetch(`${API_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo,
      estado,
      estimacion,   // el backend lo convierte/valida
      asignado_a
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error desconocido" }));
    errorP.textContent = err.error || "Error al crear tarea";
    return;
  }

  inputTitle.value = "";
  inputEstimacion.value = "";
  inputAsignado.value = "";
  selectEstado.value = "TODO";

  await cargarTareas();
});

cargarTareas();