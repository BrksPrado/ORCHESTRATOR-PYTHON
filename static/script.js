function startMonitoring() {
    fetch('/start')
        .then(response => response.text())
        .then(data => {
            console.log(data);
        });
}

function startTask(taskName) {
    fetch('/start_task', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task_name: taskName })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        if (data.task) {
            const taskElement = document.querySelector(`tr[data-task-id="${data.task.id}"]`);
            if (taskElement) {
                const statusCell = taskElement.querySelector('.status');
                statusCell.textContent = 'Executando';
                statusCell.className = `status status-em-execucao`;
            }
        }
    })
    .catch(error => console.error('Erro:', error));
}

function updateTaskStatus(tasks) {
    tasks.forEach(task => {
        const taskElement = document.querySelector(`tr[data-task-id="${task.id}"]`);
        if (taskElement) {
            const statusCell = taskElement.querySelector('.status');
            statusCell.textContent = task.status;
            statusCell.className = `status ${getStatusClass(task.status)}`;

            const timeCell = taskElement.querySelector('td:nth-child(3)');
            timeCell.textContent = task.time;

            const completionTimeCell = taskElement.querySelector('.completion-time');
            if (completionTimeCell) {
                completionTimeCell.textContent = task.completion_time || '';
            }
        }
    });
}

function getStatusClass(status) {
    switch(status) {
        case 'Concluída': return 'status-concluido';
        case 'Executando': return 'status-em-execucao';
        case 'Erro': return 'status-erro';
        default: return 'status-pendente';
    }
}

function orderbytable() {
    const table = document.getElementById('statusTable');
    if (!table) return;
    const rows = Array.from(table.querySelectorAll('tbody tr'));

    rows.sort((a, b) => {
        const timeA = a.querySelector('td:nth-child(3)').textContent.trim();
        const timeB = b.querySelector('td:nth-child(3)').textContent.trim();
        return timeA.localeCompare(timeB);
    });

    const tbody = table.querySelector('tbody');
    rows.forEach(row => tbody.appendChild(row));
}

function filterTasks() {
    const searchInput = document.getElementById('search').value.toLowerCase();
    const rows = document.querySelectorAll('#statusTable tbody tr');

    rows.forEach(row => {
        const taskName = row.querySelector('td').textContent.toLowerCase();
        if (taskName.includes(searchInput)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

setInterval(() => {
    fetch('/task_status')
        .then(response => response.json())
        .then(data => {
            updateTaskStatus(data);
            orderbytable();
        })
        .catch(error => console.error('Erro ao atualizar status das tarefas:', error));
}, 1000);

document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        event.stopPropagation();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const rowsPerPage = 20;
    const table = document.getElementById('statusTable');
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const pagination = document.getElementById('pagination'); 
    let currentPage = 1;
    let filteredRows = rows;

    function sortRowsByTime() {
        filteredRows.sort((a, b) => {
            const timeA = a.querySelector('td:nth-child(3)').textContent.trim();
            const timeB = b.querySelector('td:nth-child(3)').textContent.trim();
            return timeA.localeCompare(timeB);
        });
    }

    function displayRows() {
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;

        rows.forEach(row => row.style.display = 'none');
        filteredRows.slice(start, end).forEach(row => row.style.display = '');
    }

    function setupPagination() {
        const pageCount = Math.ceil(filteredRows.length / rowsPerPage);
        pagination.innerHTML = '';

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.classList.add('pagination-btn');
            btn.addEventListener('click', () => {
                currentPage = i;
                displayRows();
                updatePagination();
            });
            pagination.appendChild(btn);
        }
    }

    function updatePagination() {
        const buttons = pagination.querySelectorAll('.pagination-btn');
        buttons.forEach((btn, index) => {
            btn.classList.toggle('active', index + 1 === currentPage);
        });
    }

    function filterByStatus() {
        const filter = document.getElementById('statusFilter').value;
        filteredRows = filter === 'all' ? rows : rows.filter(row => {
            const status = row.querySelector('td:nth-child(2)').textContent.trim();
            return status === filter;
        });

        currentPage = 1;
        sortRowsByTime();
        displayRows();
        setupPagination();
        updatePagination();
    }

    function filterTasks() {
        const searchInput = document.getElementById('search').value.toLowerCase();
        filteredRows = rows.filter(row => {
            const taskName = row.querySelector('td').textContent.toLowerCase();
            return taskName.includes(searchInput);
        });

        currentPage = 1;
        sortRowsByTime();
        displayRows();
        setupPagination();
        updatePagination();
    }

    document.getElementById('statusFilter').addEventListener('change', filterByStatus);
    document.getElementById('search').addEventListener('input', filterTasks);

    sortRowsByTime();
    filterByStatus();
});

// Função para atualizar a tabela de execução
function updateExecutionTable() {
    const statusTable = document.getElementById('statusTable');
    const executionTable = document.getElementById('executiontable').getElementsByTagName('tbody')[0];

    executionTable.innerHTML = '';

    let hasExecution = false;

    Array.from(statusTable.getElementsByTagName('tbody')[0].rows).forEach(row => {
        const statusCell = row.querySelector('.status');
        if (statusCell && statusCell.textContent.includes('Executando')) {
            hasExecution = true;
            const newRow = executionTable.insertRow();

            newRow.style.backgroundColor = '#048e04';
            newRow.style.color = '#ffffff';

            const descriptionCell = newRow.insertCell(0);
            descriptionCell.textContent = row.querySelector('.namecolumn').textContent;
            descriptionCell.style.border = 'none';

            const startTimeCell = newRow.insertCell(1);
            startTimeCell.textContent = row.querySelector('td:nth-child(3)').textContent;
            startTimeCell.style.border = 'none';

            const machineCell = newRow.insertCell(2);
            machineCell.textContent = '2KBOT';
            machineCell.style.border = 'none';
        }
    });

    if (!hasExecution) {
        const newRow = executionTable.insertRow();
        const noExecutionCell = newRow.insertCell(0);
        noExecutionCell.colSpan = 3;
        noExecutionCell.textContent = 'Sem execução no momento !';
        noExecutionCell.style.textAlign = 'center';
        noExecutionCell.style.border = 'none';
        noExecutionCell.style.color = '#ffffff';
        noExecutionCell.style.backgroundColor = '#1d9c00';
    }
}

// Modal
var modal = document.getElementById("addTaskModal");
var btn = document.getElementById("addTaskBtn");
var span = document.getElementsByClassName("close")[0];

// Função para limpar o formulário e remover alertas
function resetForm() {
    document.getElementById('addTaskForm').reset();
    document.getElementById('nameError').textContent = '';
    document.getElementById('timeError').textContent = '';
    document.getElementById('pathError').textContent = ''; // Adiciona isso para limpar o erro do caminho
    document.getElementById('nameError').style.display = 'none';
    document.getElementById('timeError').style.display = 'none';
    document.getElementById('pathError').style.display = 'none'; // Adiciona isso para esconder o erro do caminho
}

// Eventos do Modal
btn.onclick = function() {
    modal.style.display = "block";
}

span.onclick = function() {
    modal.style.display = "none";
    resetForm();
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
        resetForm();
    }
}

// Remove o event listener anterior e adiciona apenas um
const form = document.getElementById("addTaskForm");
if (form) {
    // Remove eventos anteriores
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

        // Adiciona o novo event listener
        newForm.addEventListener("submit", function(e) {
            e.preventDefault();
            var name = document.getElementById("taskName").value.trim();
            var time = document.getElementById("taskTime").value.trim();
            var path = document.getElementById("taskPath").value.trim();
            var nameError = document.getElementById("nameError");
            var timeError = document.getElementById("timeError");
            var pathError = document.getElementById("pathError"); // Adicione este elemento no HTML
    
            // Limpa mensagens de erro
            nameError.style.display = "none";
            timeError.style.display = "none";
            pathError.style.display = "none";
    
            // Validação do arquivo .exe
            if (!path.toLowerCase().endsWith('.exe')) {
                pathError.textContent = "O caminho deve apontar para um arquivo .exe";
                pathError.style.display = "block";
                return;
            }
    
            // Limpa mensagens de erro anteriores
            nameError.textContent = "";
            timeError.textContent = "";
            nameError.style.display = "none";
            timeError.style.display = "none";
    
            // Verifica se o nome já existe
            var nameExists = Array.from(document.querySelectorAll('#statusTable tbody tr td:first-child'))
                .some(td => td.textContent.trim() === name);
    
            // Verifica se o horário já existe
            var timeExists = Array.from(document.querySelectorAll('#statusTable tbody tr td:nth-child(3)'))
                .some(td => td.textContent.trim() === time);
    
            if (nameExists) {
                nameError.textContent = "Já existe uma tarefa com este nome.";
                nameError.style.display = "block";
                return;
            }
    
            if (timeExists) {
                timeError.textContent = "Já existe uma tarefa agendada para este horário.";
                timeError.style.display = "block";
                return;
            }
    
            // Se passou pelas validações, envia a solicitação para o servidor
            fetch('/add_task', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    time: time,
                    path: path
                }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Tarefa adicionada com sucesso:', data.message);
                    addTaskToTable(data.task); // Adiciona a tarefa à tabela
                    modal.style.display = "none"; // Fecha o modal
                    resetForm(); // Reseta o formulário
                } else {
                    console.error('Erro ao adicionar tarefa:', data.message);
                    alert('Ocorreu um erro ao adicionar a tarefa: ' + data.message);
                }
            })
            .catch((error) => {
                console.error('Erro:', error);
                alert('Ocorreu um erro inesperado.');
            });
        });
    }
    
    function addTaskToTable(task) {
        const table = document.getElementById('statusTable').getElementsByTagName('tbody')[0];
        const newRow = table.insertRow();
        newRow.setAttribute('data-task-id', task.id);
    
        newRow.innerHTML = `
            <td class="namecolumn">${task.name}</td>
            <td class="status status-pendente">Pendente</td>
            <td>${task.time}</td>
            <td class="completion-time"></td>
            <td class="cellbutton">
                <button title="Iniciar automação" class="iniciar" onclick="startTask('${task.name}')">INICIAR</button>
            </td>
        `;
    
        orderbytable();
    }
    
    updateExecutionTable();
    setInterval(updateExecutionTable, 2000);