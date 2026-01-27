const API_URL = "http://127.0.0.1:5000";

const form = document.getElementById("task-form");
const inputTitle = document.getElementById("task-title");
const list = document.getElementById("task-list");
const errorP = document.getElementById("error");

async function cargarTareas() {
  errorP.textContent = "";
  list.innerHTML = "";

  const res = await fetch(`${API_URL}/tasks`);
  const tasks = await res.json();

  tasks.forEach((t) => {
    const li = document.createElement("li");
    li.textContent = `${t.titulo} - ${t.estado}`;
    list.appendChild(li);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorP.textContent = "";

  const titulo = inputTitle.value.trim();
  if (!titulo) return;

  const res = await fetch(`${API_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error desconocido" }));
    errorP.textContent = err.error || "Error al crear tarea";
    return;
  }

  inputTitle.value = "";
  await cargarTareas(); // refresca la lista
});

// Cargar lista al abrir la página
cargarTareas();
