from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

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

# =============================
# "BASE DE DATOS" EN MEMORIA
# =============================
tasks = []
next_id = 1


# =============================
# GET /tasks -> listar tareas
# =============================
@app.route("/tasks", methods=["GET"])
def get_tasks():
    return jsonify([t.to_dict() for t in tasks])


# =============================
# POST /tasks -> crear tarea
# Body JSON:
# { "titulo": "...", "estimacion": 1-10, "asignado_a": "..." }
# =============================
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

    return jsonify(new_task.to_dict()), 201


# =============================
# PUT /tasks/<id> -> actualizar estado (Kanban drag&drop)
# Body JSON: { "estado": "TODO" | "IN_PROGRESS" | "DONE" }
# =============================
@app.route("/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    data = request.get_json(silent=True) or {}
    nuevo_estado = data.get("estado")

    if nuevo_estado not in {"TODO", "IN_PROGRESS", "DONE"}:
        return jsonify(error="Estado inválido. Usa TODO, IN_PROGRESS o DONE."), 400

    for t in tasks:
        if t.id == task_id:
            t.estado = nuevo_estado
            return jsonify(t.to_dict()), 200

    return jsonify(error="Tarea no encontrada"), 404


# =============================
# DELETE /tasks/<id> -> eliminar tarea
# =============================
@app.route("/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    for i, t in enumerate(tasks):
        if t.id == task_id:
            tasks.pop(i)
            return jsonify(message="Tarea eliminada"), 200

    return jsonify(error="Tarea no encontrada"), 404


# =============================
# RUN
# =============================
if __name__ == "__main__":
    app.run(debug=True)
