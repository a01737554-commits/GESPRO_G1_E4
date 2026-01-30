const API = "http://127.0.0.1:5000";
let draggedTaskId = null;

const DEFAULT_WIP_INPROGRESS = 20;

// =============================
// Sesión + roles
// =============================
function setSession(obj){ localStorage.setItem("session", JSON.stringify(obj)); }
function getSession(){ try { return JSON.parse(localStorage.getItem("session")); } catch { return null; } }
function clearSession(){ localStorage.removeItem("session"); }

function role() {
  const s = getSession();
  return s?.rol || "guest";
}
function username() {
  const s = getSession();
  return s?.usuario || null;
}
function authHeaders() {
  const s = getSession();
  if (!s || s.rol === "guest") return {};
  return { "X-User": s.usuario, "X-Role": s.rol };
}

function showApp(){
  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
}
function showLogin(){
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login").classList.remove("hidden");
}

// =============================
// WIP (solo admin cambia)
// =============================
function getWip(){
  const v = parseInt(localStorage.getItem("wip-IN_PROGRESS"), 10);
  return Number.isFinite(v) ? v : DEFAULT_WIP_INPROGRESS;
}
function setWip(v){ localStorage.setItem("wip-IN_PROGRESS", String(v)); }
function wipAllowed(base){ return Math.ceil(base * 1.10); }

// =============================
// UI permisos
// =============================
function applyRolePermissions() {
  const r = role();

  document.getElementById("roleBadge").textContent = r.toUpperCase();

  // WIP: solo admin
  const wipSel = document.getElementById("wip-IN_PROGRESS");
  wipSel.disabled = (r !== "admin");

  // crear tarea: admin y member
  const canWrite = (r === "admin" || r === "member");
  document.getElementById("title").disabled = !canWrite;
  document.getElementById("estimacion").disabled = !canWrite;
  document.getElementById("asignado").disabled = !canWrite;
  document.getElementById("createTaskBtn").disabled = !canWrite;

  document.getElementById("task-form").style.opacity = canWrite ? "1" : "0.5";
}

// =============================
// Usuarios dropdown
// =============================
async function loadUsers(){
  const select = document.getElementById("asignado");
  select.innerHTML = `<option value="">Sin asignar</option>`;

  const res = await fetch(`${API}/users`);
  const users = await res.json();

  users.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.usuario;
    opt.textContent = `${u.nombre || u.usuario} (${u.usuario})`;
    select.appendChild(opt);
  });
}

// =============================
// Card
// =============================
function canCurrentUserMoveTask(task) {
  const r = role();
  if (r === "admin") return true;
  if (r === "member") {
    // ✅ solo si está asignada a su usuario
    return task.asignado_a === username();
  }
  return false; // guest
}

function createTaskCard(t){
  const taskDiv = document.createElement("div");
  taskDiv.className = "task";
  taskDiv.dataset.id = t.id;
  taskDiv.style.order = String(1000 - t.estimacion);

  const movable = canCurrentUserMoveTask(t);
  taskDiv.draggable = movable;

  taskDiv.addEventListener("dragstart", () => {
    if (!movable) {
      draggedTaskId = null;
      return;
    }
    draggedTaskId = t.id;
  });

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

  right.appendChild(est);

  // botones editar/eliminar: admin todo, member solo si es su tarea
  const canEditDelete = (role() === "admin") || (role() === "member" && t.asignado_a === username());

  if (canEditDelete) {
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "✏️";
    editBtn.title = "Editar tarea";
    editBtn.style.border = "1px solid #333";
    editBtn.style.background = "white";
    editBtn.style.borderRadius = "6px";
    editBtn.style.cursor = "pointer";
    editBtn.style.padding = "2px 6px";

    editBtn.addEventListener("click", async () => {
      const newTitle = prompt("Nuevo título:", t.titulo);
      if (newTitle === null) return;

      const newAsignado = prompt("Nuevo asignado a (vacío = sin asignar):", t.asignado_a || "");
      if (newAsignado === null) return;

      const newEst = prompt("Nueva estimación (1-10):", String(t.estimacion));
      if (newEst === null) return;

      const estInt = parseInt(newEst, 10);
      if (!newTitle.trim()) return alert("El título no puede estar vacío");
      if (!Number.isFinite(estInt) || estInt < 1 || estInt > 10) return alert("Estimación 1-10");

      const res = await fetch(`${API}/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ titulo: newTitle.trim(), asignado_a: newAsignado.trim(), estimacion: estInt })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "No autorizado" }));
        return alert(err.error || "No autorizado");
      }
      loadBoard();
    });

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

    delBtn.addEventListener("click", async () => {
      if (!confirm("¿Eliminar esta tarea?")) return;
      const res = await fetch(`${API}/tasks/${t.id}`, { method: "DELETE", headers: { ...authHeaders() } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "No autorizado" }));
        return alert(err.error || "No autorizado");
      }
      loadBoard();
    });

    right.appendChild(editBtn);
    right.appendChild(delBtn);
  }

  taskDiv.appendChild(info);
  taskDiv.appendChild(right);

  return taskDiv;
}

// =============================
// Board
// =============================
let counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };

async function loadBoard(){
  document.querySelectorAll(".task").forEach(t => t.remove());

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
    if (!Number.isFinite(est)) return;
    if (!grouped[t.estado]) return;

    const task = { ...t, estimacion: est };
    grouped[t.estado].push(task);
    totals[t.estado] += est;
    counts[t.estado] += 1;
  });

  Object.keys(grouped).forEach(s => grouped[s].sort((a,b) => b.estimacion - a.estimacion));

  Object.keys(grouped).forEach(status => {
    const col = document.querySelector(`.column[data-status="${status}"]`);
    grouped[status].forEach(t => col.appendChild(createTaskCard(t)));
  });

  document.getElementById("total-TODO").textContent = totals.TODO;
  document.getElementById("total-IN_PROGRESS").textContent = totals.IN_PROGRESS;
  document.getElementById("total-DONE").textContent = totals.DONE;

  const allowed = wipAllowed(getWip());
  document.getElementById("wipcount-IN_PROGRESS").textContent = `${counts.IN_PROGRESS}/${allowed}`;
}

// Drag & drop
document.querySelectorAll(".column").forEach(col => {
  col.addEventListener("dragover", e => {
    if (role() === "guest") return;
    e.preventDefault();
  });

  col.addEventListener("drop", async () => {
    if (role() === "guest") return;
    if (!draggedTaskId) return;

    const target = col.dataset.status;

    if (target === "IN_PROGRESS") {
      const allowed = wipAllowed(getWip());
      if (counts.IN_PROGRESS >= allowed) {
        alert(`WIP límite alcanzado en IN PROGRESS (${counts.IN_PROGRESS}/${allowed}).`);
        draggedTaskId = null;
        return;
      }
    }

    const res = await fetch(`${API}/tasks/${draggedTaskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ estado: target })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "No autorizado" }));
      alert(err.error || "No autorizado");
    }

    draggedTaskId = null;
    loadBoard();
  });
});

// Crear tarea
document.getElementById("task-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (role() === "guest") return alert("Invitado: solo lectura");

  const titulo = document.getElementById("title").value.trim();
  const estimacion = parseInt(document.getElementById("estimacion").value, 10);
  const asignado_a = document.getElementById("asignado").value;

  if (!titulo || !Number.isFinite(estimacion)) return;

  const res = await fetch(`${API}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ titulo, estimacion, asignado_a })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "No autorizado" }));
    return alert(err.error || "No autorizado");
  }

  e.target.reset();
  loadUsers();
  loadBoard();
});

// WIP select: solo admin
document.getElementById("wip-IN_PROGRESS").addEventListener("change", (e) => {
  if (role() !== "admin") {
    e.target.value = String(getWip());
    return alert("Solo el administrador puede cambiar el WIP");
  }
  setWip(parseInt(e.target.value, 10));
  loadBoard();
});

// =============================
// Login / Invitado
// =============================
async function doLogin(){
  const usuario = document.getElementById("login-user").value.trim();
  const pass = document.getElementById("login-pass").value.trim();

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, pass })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.ok) {
    alert(data.error || "Usuario no válido");
    return;
  }

  setSession({ usuario: data.usuario, nombre: data.nombre || data.usuario, rol: data.rol || "member" });
  initAfterLogin();
}

function doGuest(){
  setSession({ usuario: null, nombre: "Invitado", rol: "guest" });
  initAfterLogin();
}

function initAfterLogin(){
  const s = getSession();
  if (!s) return;

  showApp();
  document.getElementById("welcome").textContent = `Hola, ${s.nombre}`;
  document.getElementById("roleBadge").textContent = role().toUpperCase();

  document.getElementById("wip-IN_PROGRESS").value = String(getWip());

  applyRolePermissions();
  loadUsers();
  loadBoard();
}

document.getElementById("logout-btn").addEventListener("click", () => {
  clearSession();
  showLogin();
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await doLogin();
});

document.getElementById("guest-btn").addEventListener("click", doGuest);

window.addEventListener("DOMContentLoaded", () => {
  const s = getSession();
  if (s) initAfterLogin();
  else showLogin();
});
