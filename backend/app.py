from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

class Task:
    def __init__(self, id, titulo, estado="TODO", estimacion=None, asignado_a=None):
        self.id = id
        self.titulo = titulo
        self.estado = estado
        self.estimacion = estimacion  # puede ser int/float o None
        self.asignado_a = asignado_a  # string o None

    def to_dict(self):
        return {
            "id": self.id,
            "titulo": self.titulo,
            "estado": self.estado,
            "estimacion": self.estimacion,
            "asignado_a": self.asignado_a
        }

# "Base de datos" en memoria
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

    # nuevos campos
    asignado_a = (data.get("asignado_a") or "").strip() or None
    estimacion_raw = data.get("estimacion")

    if not titulo:
        return jsonify(error="El título no puede estar vacío"), 400

    # Validar estado (opcional pero limpio)
    estados_validos = {"TODO", "IN_PROGRESS", "DONE"}
    if estado not in estados_validos:
        return jsonify(error="Estado inválido. Usa TODO, IN_PROGRESS o DONE."), 400

    # Validar/convertir estimación (opcional)
    estimacion = None
    if estimacion_raw not in (None, ""):
        try:
            estimacion = float(estimacion_raw)
            if estimacion < 0:
                return jsonify(error="La estimación no puede ser negativa."), 400
        except (ValueError, TypeError):
            return jsonify(error="La estimación debe ser un número."), 400

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