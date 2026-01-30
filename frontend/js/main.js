const API = "http://127.0.0.1:5000";
let draggedTaskId = null;

const DEFAULT_WIP_INPROGRESS = 20;

// =============================
// Toast
// =============================
function toast(msg){
  const t = document.getElementById("toast");
  const tt = document.getElementById("toastText");
  if (!t || !tt) return alert(msg);
  tt.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(()=> t.classList.remove("show"), 2200);
}

// =============================
// Sesión + roles
// =============================
function setSession(obj){ localStorage.setItem("session", JSON.stringify(obj)); }
function getSession(){ try { return JSON.parse(localStorage.getItem("session")); } catch { return null; } }
function clearSession(){ localStorage.removeItem("session"); }

function role(){ return getSession()?.rol || "guest"; }
function username(){ return getSession()?.usuario || null; }

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
// WIP
// =============================
function getWip(){
  const v = parseInt(localStorage.getItem("wip-IN_PROGRESS"), 10);
  return Number.isFinite(v) ? v : DEFAULT_WIP_INPROGRESS;
}
function setWip(v){ localStorage.setItem("wip-IN_PROGRESS", String(v)); }
function wipAllowed(base){ return Math.ceil(base * 1.10); }

// =============================
// Permisos UI
// =============================
function applyRolePermissions(){
  const r = role();
  document.getElementById("roleBadge").textContent = r.toUpperCase();

  // Mode chip
  const modeChip = document.getElementById("modeChip");
  if (modeChip){
    if (r === "admin") modeChip.textContent = "Modo: Administrador";
    else if (r === "member") modeChip.textContent = "Modo: Miembro";
    else modeChip.textContent = "Modo: Invitado (solo lectura)";
  }

  // WIP: solo admin
  const wipSel = document.getElementById("wip-IN_PROGRESS");
  wipSel.disabled = (r !== "admin");
  document.getElementById("wipCard").classList.toggle("readonly", r !== "admin");

  // crear tarea
  const canWrite = (r === "admin" || r === "member");
  document.getElementById("title").disabled = !canWrite;
  document.getElementById("estimacion").disabled = !canWrite;
  document.getElementById("asignado").disabled = !canWrite;
  document.getElementById("createTaskBtn").disabled = !canWrite;

  document.getElementById("controlsCard").classList.toggle("readonly", !canWrite);
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
// Reglas de movimiento
// =============================
function canCurrentUserMoveTask(task){
  const r = role();
  if (r === "admin") return true;
  if (r === "member") return task.asignado_a === username();
  return false; // guest
}

function canCurrentUserEditTask(task){
  const r = role();
  if (r === "admin") return true;
  if (r === "member") return task.asignado_a === username();
  return false;
}

// =============================
// Card render
// =============================
function createTaskCard(t){
  const taskDiv = document.createElement("div");
  taskDiv.className = "task";
  taskDiv.dataset.id = t.id;
  taskDiv.style.order = String(1000 - t.estimacion);

  const movable = canCurrentUserMoveTask(t);
  taskDiv.draggable = movable;

  taskDiv.addEventListener("dragstart", () => {
    if (!movable) { draggedTaskId = null; return; }
    draggedTaskId = t.id;
    taskDiv.classList.add("dragging");
  });

  taskDiv.addEventListener("dragend", () => {
    taskDiv.classList.remove("dragging");
  });

  const main = document.createElement("div");
  main.className = "task-main";

  const title = document.createElement("div");
  title.className = "task-title";
  title.textContent = t.titulo;

  const sub = document.createElement("div");
  sub.className = "task-sub";

  const who = document.createElement("span");
  who.className = "tag";
  who.textContent = t.asignado_a ? `@${t.asignado_a}` : "sin asignar";

  const lock = document.createElement("span");
  lock.className = "tag";
  lock.textContent = movable ? "movible" : (role()==="guest" ? "solo lectura" : "no asignada a ti");

  sub.appendChild(who);
  sub.appendChild(lock);

  main.appendChild(title);
  main.appendChild(sub);

  const right = document.createElement("div");
  right.className = "task-right";

  const est = document.createElement("div");
  est.className = "est-bubble";
  est.textContent = t.estimacion;

  right.appendChild(est);

  // acciones
  const canEdit = canCurrentUserEditTask(t);
  if (canEdit){
    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn";
    editBtn.type = "button";
    editBtn.title = "Editar";
    editBtn.textContent = "✏️";

    editBtn.addEventListener("click", async () => {
      const newTitle = prompt("Nuevo título:", t.titulo);
      if (newTitle === null) return;

      const newAsignado = prompt("Nuevo asignado a (usuario, vacío = sin asignar):", t.asignado_a || "");
      if (newAsignado === null) return;

      const newEst = prompt("Nueva estimación (1-10):", String(t.estimacion));
      if (newEst === null) return;

      const estInt = parseInt(newEst, 10);
      if (!newTitle.trim()) return toast("El título no puede estar vacío");
      if (!Number.isFinite(estInt) || estInt < 1 || estInt > 10) return toast("Estimación debe ser 1–10");

      const res = await fetch(`${API}/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ titulo: newTitle.trim(), asignado_a: newAsignado.trim(), estimacion: estInt })
      });

      if (!res.ok){
        const err = await res.json().catch(()=>({error:"No autorizado"}));
        return toast(err.error || "No autorizado");
      }
      toast("Tarea actualizada");
      loadBoard();
    });

    const delBtn = document.createElement("button");
    delBtn.className = "icon-btn";
    delBtn.type = "button";
    delBtn.title = "Eliminar";
    delBtn.textContent = "🗑️";

    delBtn.addEventListener("click", async () => {
      if (!confirm("¿Eliminar esta tarea?")) return;
      const res = await fetch(`${API}/tasks/${t.id}`, { method: "DELETE", headers: { ...authHeaders() } });
      if (!res.ok){
        const err = await res.json().catch(()=>({error:"No autorizado"}));
        return toast(err.error || "No autorizado");
      }
      toast("Tarea eliminada");
      loadBoard();
    });

    right.appendChild(editBtn);
    right.appendChild(delBtn);
  }

  taskDiv.appendChild(main);
  taskDiv.appendChild(right);

  return taskDiv;
}

// =============================
// Board
// =============================
let counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };

async function loadBoard(){
  // limpiar cards
  document.querySelectorAll(".task").forEach(t => t.remove());

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

  // ordenar por estimación desc
  Object.keys(grouped).forEach(s => grouped[s].sort((a,b)=> b.estimacion - a.estimacion));

  // render
  Object.keys(grouped).forEach(status => {
    const col = document.querySelector(`.column[data-status="${status}"]`);
    grouped[status].forEach(t => col.appendChild(createTaskCard(t)));
  });

  // totals
  document.getElementById("total-TODO").textContent = totals.TODO;
  document.getElementById("total-IN_PROGRESS").textContent = totals.IN_PROGRESS;
  document.getElementById("total-DONE").textContent = totals.DONE;

  // wip label + badge
  const allowed = wipAllowed(getWip());
  document.getElementById("wipcount-IN_PROGRESS").textContent = `${counts.IN_PROGRESS}/${allowed}`;
  document.getElementById("wipLabel").textContent = `Permitidas: ${allowed} (base ${getWip()})`;
}

// =============================
// Drag & drop
// =============================
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
        toast(`WIP límite alcanzado (${counts.IN_PROGRESS}/${allowed})`);
        draggedTaskId = null;
        return;
      }
    }

    const res = await fetch(`${API}/tasks/${draggedTaskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ estado: target })
    });

    if (!res.ok){
      const err = await res.json().catch(()=>({error:"No autorizado"}));
      toast(err.error || "No autorizado");
    } else {
      toast("Estado actualizado");
    }

    draggedTaskId = null;
    loadBoard();
  });
});

// =============================
// Crear tarea
// =============================
document.getElementById("task-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (role() === "guest") return toast("Invitado: solo lectura");

  const titulo = document.getElementById("title").value.trim();
  const estimacion = parseInt(document.getElementById("estimacion").value, 10);
  const asignado_a = document.getElementById("asignado").value;

  if (!titulo || !Number.isFinite(estimacion)) return;

  const res = await fetch(`${API}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ titulo, estimacion, asignado_a })
  });

  if (!res.ok){
    const err = await res.json().catch(()=>({error:"No autorizado"}));
    return toast(err.error || "No autorizado");
  }

  e.target.reset();
  await loadUsers();
  toast("Tarea creada");
  loadBoard();
});

// =============================
// WIP: solo admin
// =============================
document.getElementById("wip-IN_PROGRESS").addEventListener("change", (e) => {
  if (role() !== "admin") {
    e.target.value = String(getWip());
    return toast("Solo admin puede cambiar WIP");
  }
  setWip(parseInt(e.target.value, 10));
  toast("WIP actualizado");
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

  const data = await res.json().catch(()=> ({}));

  if (!res.ok || !data.ok){
    toast(data.error || "Usuario no válido");
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

  // wip select value
  document.getElementById("wip-IN_PROGRESS").value = String(getWip());

  applyRolePermissions();
  loadUsers();
  loadBoard();
}

document.getElementById("logout-btn").addEventListener("click", () => {
  clearSession();
  showLogin();
  toast("Sesión cerrada");
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await doLogin();
});

document.getElementById("guest-btn").addEventListener("click", doGuest);

// init
window.addEventListener("DOMContentLoaded", () => {
  const s = getSession();
  if (s) initAfterLogin();
  else showLogin();
});
