from flask import Flask, jsonify
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
        return {
            "id": self.id,
            "titulo": self.titulo,
            "estado": self.estado
        }

# ===== LISTA SIMULADA DE TAREAS =====
tasks = [
    Task(1, "Crear estructura del proyecto", "DONE"),
    Task(2, "Configurar backend", "IN_PROGRESS"),
    Task(3, "Mostrar tareas en el frontend", "TODO")
]

# ===== ENDPOINT GET /tasks =====
@app.route("/tasks", methods=["GET"])
def get_tasks():
    return jsonify([task.to_dict() for task in tasks])

if __name__ == "__main__":
    app.run(debug=True)
