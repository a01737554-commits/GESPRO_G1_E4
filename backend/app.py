from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ===== MODELO TASK =====
class Task:
    def __init__(self, id, titulo, estado="TODO"):
        self.id = id
        self.titulo = titulo
        self.estado = estado

    def to_dict(self):
        return {"id": self.id, "titulo": self.titulo, "estado": self.estado}

# ===== "BASE DE DATOS" EN MEMORIA =====
tasks = []          # aquí se guardan las tareas mientras el servidor esté encendido
next_id = 1         # contador simple para IDs

# ===== GET /tasks: listar tareas =====
@app.route("/tasks", methods=["GET"])
def get_tasks():
    return jsonify([t.to_dict() for t in tasks])

# ===== POST /tasks: crear tarea y guardarla en memoria =====
@app.route("/tasks", methods=["POST"])
def create_task():
    global next_id

    data = request.get_json(silent=True) or {}
    titulo = (data.get("titulo") or "").strip()

    # validación básica (la del backlog siguiente te pide esto)
    if not titulo:
        return jsonify(error="El título no puede estar vacío"), 400

    new_task = Task(next_id, titulo, "TODO")
    next_id += 1

    tasks.append(new_task)  # 👈 persistencia en memoria (se queda guardada)
    return jsonify(new_task.to_dict()), 201

if __name__ == "__main__":
    app.run(debug=True)
