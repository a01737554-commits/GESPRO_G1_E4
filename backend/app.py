import json
import os
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(__file__)
DATA_FILE = os.path.join(BASE_DIR, "tareas.json")
USERS_FILE = os.path.join(BASE_DIR, "bbdd", "usuarios.txt")


# =============================
# TASK MODEL
# =============================
class Task:
    def __init__(self, id, titulo, estado="TODO", estimacion=1, asignado_a=None):
        self.id = id
        self.titulo = titulo
        self.estado = estado
        self.estimacion = estimacion
        self.asignado_a = asignado_a

    def to_dict(self):
        return {
            "id": self.id,
            "titulo": self.titulo,
            "estado": self.estado,
            "estimacion": self.estimacion,
            "asignado_a": self.asignado_a
        }

    @staticmethod
    def from_dict(d):
        return Task(
            id=int(d["id"]),
            titulo=d.get("titulo", ""),
            estado=d.get("estado", "TODO"),
            estimacion=int(d.get("estimacion", 1)),
            asignado_a=d.get("asignado_a", None)
        )


tasks = []
next_id = 1


# =============================
# TASKS JSON PERSISTENCE
# =============================
def load_tasks_from_file():
    global tasks, next_id
    if not os.path.exists(DATA_FILE):
        tasks = []
        next_id = 1
        return

    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            data = []
        tasks = [Task.from_dict(d) for d in data]
        max_id = max([t.id for t in tasks], default=0)
        next_id = max_id + 1
    except Exception:
        tasks = []
        next_id = 1


def save_tasks_to_file():
    data = [t.to_dict() for t in tasks]
    tmp_file = DATA_FILE + ".tmp"
    with open(tmp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp_file, DATA_FILE)


load_tasks_from_file()


# =============================
# USERS
# usuario|pass|nombre|rol(opcional)
# rol: admin | member
# =============================
def load_users_raw():
    users = []
    if not os.path.exists(USERS_FILE):
        return users

    with open(USERS_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            if line.lower().startswith("usuario|"):
                continue

            parts = [p.strip() for p in line.split("|")]
            if len(parts) < 2:
                continue

            username = parts[0]
            password = parts[1]
            full_name = parts[2] if len(parts) >= 3 else ""
            role = parts[3].lower() if len(parts) >= 4 and parts[3].strip() else "member"

            if role not in {"admin", "member"}:
                role = "member"

            if username and password:
                users.append({
                    "usuario": username,
                    "pass": password,
                    "nombre": full_name,
                    "rol": role
                })
    return users


def get_user_by_username(username: str):
    for u in load_users_raw():
        if u["usuario"] == username:
            return u
    return None


def load_users_public():
    """Para dropdown: sin password"""
    return [{"usuario": u["usuario"], "nombre": u.get("nombre", ""), "rol": u.get("rol", "member")} for u in load_users_raw()]


# =============================
# AUTH: headers X-User y X-Role
# Si no vienen -> guest
# Backend valida que el rol coincida con el del fichero
# =============================
def get_identity_from_headers():
    username = (request.headers.get("X-User") or "").strip()
    role = (request.headers.get("X-Role") or "").strip().lower()

    if not username or not role:
        return {"usuario": None, "rol": "guest"}  # invitado por defecto

    if role == "guest":
        return {"usuario": None, "rol": "guest"}

    u = get_user_by_username(username)
    if not u:
        return {"usuario": None, "rol": "guest"}

    # Si el rol enviado no coincide con el del archivo, lo tratamos como guest
    if u.get("rol", "member") != role:
        return {"usuario": None, "rol": "guest"}

    return {"usuario": username, "rol": role}


def require_not_guest():
    ident = get_identity_from_headers()
    if ident["rol"] == "guest":
        return False, ident
    return True, ident


# =============================
# ENDPOINTS
# =============================
@app.route("/users", methods=["GET"])
def get_users():
    # cualquiera puede ver la lista (para dropdown)
    return jsonify(load_users_public())


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    usuario = (data.get("usuario") or "").strip()
    password = (data.get("pass") or "").strip()

    if not usuario or not password:
        return jsonify(ok=False, error="Faltan datos"), 400

    u = get_user_by_username(usuario)
    if u and u["pass"] == password:
        return jsonify(ok=True, usuario=u["usuario"], nombre=u.get("nombre", u["usuario"]), rol=u.get("rol", "member")), 200

    return jsonify(ok=False, error="Usuario no válido"), 401


# ---- TASKS ----
@app.route("/tasks", methods=["GET"])
def get_tasks():
    return jsonify([t.to_dict() for t in tasks])


@app.route("/tasks", methods=["POST"])
def create_task():
    ok, ident = require_not_guest()
    if not ok:
        return jsonify(error="No autorizado (guest)"), 403

    global next_id
    data = request.get_json(silent=True) or {}

    titulo = (data.get("titulo") or "").strip()
    asignado_a = (data.get("asignado_a") or "").strip() or None
    estimacion_raw = data.get("estimacion")

    if not titulo:
        return jsonify(error="El título es obligatorio"), 400

    try:
        estimacion = int(estimacion_raw)
        if estimacion < 1 or estimacion > 10:
            return jsonify(error="La estimación debe ser un entero entre 1 y 10"), 400
    except (ValueError, TypeError):
        return jsonify(error="La estimación debe ser un entero entre 1 y 10"), 400

    new_task = Task(
        id=next_id,
        titulo=titulo,
        estado="TODO",
        estimacion=estimacion,
        asignado_a=asignado_a
    )

    next_id += 1
    tasks.append(new_task)
    save_tasks_to_file()
    return jsonify(new_task.to_dict()), 201


@app.route("/tasks/<int:task_id>", methods=["PUT"])
def update_task_state(task_id):
    ok, ident = require_not_guest()
    if not ok:
        return jsonify(error="No autorizado (guest)"), 403

    data = request.get_json(silent=True) or {}
    nuevo_estado = data.get("estado")

    if nuevo_estado not in {"TODO", "IN_PROGRESS", "DONE"}:
        return jsonify(error="Estado inválido. Usa TODO, IN_PROGRESS o DONE."), 400

    for t in tasks:
        if t.id == task_id:
            t.estado = nuevo_estado
            save_tasks_to_file()
            return jsonify(t.to_dict()), 200

    return jsonify(error="Tarea no encontrada"), 404


@app.route("/tasks/<int:task_id>", methods=["PATCH"])
def patch_task(task_id):
    ok, ident = require_not_guest()
    if not ok:
        return jsonify(error="No autorizado (guest)"), 403

    data = request.get_json(silent=True) or {}

    task = None
    for t in tasks:
        if t.id == task_id:
            task = t
            break
    if task is None:
        return jsonify(error="Tarea no encontrada"), 404

    if "titulo" in data:
        titulo = (data.get("titulo") or "").strip()
        if not titulo:
            return jsonify(error="El título no puede estar vacío"), 400
        task.titulo = titulo

    if "asignado_a" in data:
        asignado = (data.get("asignado_a") or "").strip()
        task.asignado_a = asignado if asignado else None

    if "estimacion" in data:
        try:
            est = int(data.get("estimacion"))
            if est < 1 or est > 10:
                return jsonify(error="La estimación debe ser un entero entre 1 y 10"), 400
            task.estimacion = est
        except (ValueError, TypeError):
            return jsonify(error="La estimación debe ser un entero entre 1 y 10"), 400

    save_tasks_to_file()
    return jsonify(task.to_dict()), 200


@app.route("/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    ok, ident = require_not_guest()
    if not ok:
        return jsonify(error="No autorizado (guest)"), 403

    for i, t in enumerate(tasks):
        if t.id == task_id:
            tasks.pop(i)
            save_tasks_to_file()
            return jsonify(message="Tarea eliminada"), 200

    return jsonify(error="Tarea no encontrada"), 404


if __name__ == "__main__":
    app.run(debug=True)
