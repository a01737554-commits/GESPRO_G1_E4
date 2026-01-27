from flask import Flask, jsonify

app = Flask(__name__)

# Endpoint principal de prueba
@app.route('/')
def home():
    return 'Backend funcionando correctamente'

# Endpoint de health check
@app.route('/health')
def health():
    return jsonify({"status": "OK", "message": "El backend está vivo"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)  # Puedes cambiar el puerto si quieres
