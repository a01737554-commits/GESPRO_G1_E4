from flask import Flask, jsonify

app = Flask(__name__)

# Endpoint raíz
@app.route("/")  # o "/health"
def home():
    return jsonify({"message": "Backend funcionando correctamente!"})

if __name__ == "__main__":
    app.run(debug=True)
