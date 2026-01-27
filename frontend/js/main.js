fetch("http://127.0.0.1:5000/tasks")
    .then(response => response.json())
    .then(tasks => {
        const list = document.getElementById("task-list");

        tasks.forEach(task => {
            const li = document.createElement("li");
            li.textContent = `${task.titulo} - ${task.estado}`;
            list.appendChild(li);
        });
    })
    .catch(error => console.error("Error:", error));