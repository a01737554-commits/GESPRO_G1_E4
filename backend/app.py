from flask import Flask, jsonify

app = Flask(__name__)

<<<<<<< HEAD
@app.route("/")
def home():
    return jsonify({
        "status": "OK",
        "message": "Backend funcionando correctamente!"
    })

@app.route("/health")
def health():
    return jsonify({
        "service": "flask-backend",
        "state": "running"
    })

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
=======
# Modelo simple de Task
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

# Persistencia en memoria
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
>>>>>>> 58ed747251cc50f20071c42aba33393b86458424
