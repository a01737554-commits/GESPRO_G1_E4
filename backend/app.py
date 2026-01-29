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

    data = request.get_json(silent=True) or {}

    titulo = (data.get("titulo") or "").strip()
    estado = (data.get("estado") or "TODO").strip()
    asignado_a = (data.get("asignado_a") or "").strip() or None
    estimacion_raw = data.get("estimacion")

    if not titulo:
        return jsonify(error="El título no puede estar vacío"), 400

    # 🔒 Estimación obligatoria (1 a 10, enteros)
    try:
        estimacion = int(estimacion_raw)
        if estimacion < 1 or estimacion > 10:
            return jsonify(error="La estimación debe estar entre 1 y 10"), 400
    except (ValueError, TypeError):
        return jsonify(error="La estimación debe ser un número entero"), 400

    estados_validos = {"TODO", "IN_PROGRESS", "DONE"}
    if estado not in estados_validos:
        return jsonify(error="Estado inválido"), 400

    new_task = Task(
        id=next_id,
        titulo=titulo,
        estado=estado,
        estimacion=estimacion,
        asignado_a=asignado_a
    )
    next_id += 1
    tasks.append(new_task)

    return jsonify(new_task.to_dict()), 201

if __name__ == "__main__":
    app.run(debug=True)