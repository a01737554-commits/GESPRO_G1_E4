from flask import Flask, jsonify

app = Flask(__name__)
@app.route("/")

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

tasks = [
    Task(1, "Configurar backend", "DONE"),
    Task(2, "Definir modelo Task", "IN_PROGRESS"),
    Task(3, "Conectar frontend", "TODO")
]

@app.route("/tasks")
def get_tasks():
    return jsonify([t.to_dict() for t in tasks])

if __name__ == "__main__":
    app.run(debug=True)