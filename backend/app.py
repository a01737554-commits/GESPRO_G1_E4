import json
import os
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# =============================
# CONFIG PERSISTENCIA
# =============================
DATA_FILE = os.path.join(os.path.dirname(__file__), "tareas.json")


# =============================
# MODELO
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


# =============================
# "DB" EN MEMORIA
# =============================
tasks = []
next_id = 1


# =============================
# UTILIDADES JSON
# =============================
def load_tasks_from_file():
    """Carga tareas desde tareas.json si existe."""
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

        # next_id = max(id)+1
        max_id = max([t.id for t in tasks], default=0)
        next_id = max_id + 1

    except Exception:
        # Si el archivo se corrompe, arrancamos limpio para no romper la app
        tasks = []
        next_id = 1


def save_tasks_to_file():
    """Guarda tareas a tareas.json (escritura atómica)."""
    data = [t.to_dict() for t in tasks]
    tmp_file = DATA_FILE + ".tmp"

    with open(tmp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    os.replace(tmp_file, DATA_FILE)


# Cargar al iniciar
load_tasks_from_file()


# =============================
# ENDPOINTS
# =============================

@app.route("/tasks", methods=["GET"])
def get_tasks():
    return jsonify([t.to_dict() for t in tasks])


@app.route("/tasks", methods=["POST"])
def create_task():
    global next_id

    data = request.get_json(silent=True) or {}
    titulo = (data.get("titulo") or "").strip()
    asignado_a = (data.get("asignado_a") or "").strip() or None
    estimacion_raw = data.get("estimacion")

    if not titulo:
        return jsonify(error="El título es obligatorio"), 400

    # estimación obligatoria: entero 1-10
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
    data = request.get_json(silent=True) or {}

    task = None
    for t in tasks:
        if t.id == task_id:
            task = t
            break

    if task is None:
        return jsonify(error="Tarea no encontrada"), 404

    # titulo
    if "titulo" in data:
        titulo = (data.get("titulo") or "").strip()
        if not titulo:
            return jsonify(error="El título no puede estar vacío"), 400
        task.titulo = titulo

    # asignado_a (vacío => None)
    if "asignado_a" in data:
        asignado = (data.get("asignado_a") or "").strip()
        task.asignado_a = asignado if asignado else None

    # estimación 1-10
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
    for i, t in enumerate(tasks):
        if t.id == task_id:
            tasks.pop(i)
            save_tasks_to_file()
            return jsonify(message="Tarea eliminada"), 200

    return jsonify(error="Tarea no encontrada"), 404


if __name__ == "__main__":
    app.run(debug=True)
