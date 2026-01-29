from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

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

tasks = []
next_id = 1

@app.route("/tasks", methods=["GET"])
def get_tasks():
    return jsonify([t.to_dict() for t in tasks])

@app.route("/tasks", methods=["POST"])
def create_task():
    global next_id
    data = request.get_json() or {}

    titulo = (data.get("titulo") or "").strip()
    asignado_a = (data.get("asignado_a") or "").strip() or None
    estimacion_raw = data.get("estimacion")

    if not titulo:
        return jsonify(error="Título obligatorio"), 400

    try:
        estimacion = int(estimacion_raw)
        if estimacion < 1 or estimacion > 10:
            raise ValueError
    except:
        return jsonify(error="Estimación debe ser entero 1–10"), 400

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

# 🔄 actualizar estado (drag & drop)
@app.route("/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    data = request.get_json() or {}
    nuevo_estado = data.get("estado")

    if nuevo_estado not in {"TODO", "IN_PROGRESS", "DONE"}:
        return jsonify(error="Estado inválido"), 400

    for t in tasks:
        if t.id == task_id:
            t.estado = nuevo_estado
            return jsonify(t.to_dict())

    return jsonify(error="Tarea no encontrada"), 404

if __name__ == "__main__":
    app.run(debug=True)