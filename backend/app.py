from flask import Flask, jsonify

app = Flask(__name__)

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