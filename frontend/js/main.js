fetch("http://127.0.0.1:5000/test")
    .then(response => response.json())
    .then(data => {
        document.getElementById("respuesta").textContent = data.message;
    })
    .catch(error => {
        document.getElementById("respuesta").textContent = "Error de conexión";
        console.error(error);
    });