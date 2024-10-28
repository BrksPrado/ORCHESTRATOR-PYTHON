// Funções principais
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
            console.log(`Atualizando status para ${task.name}: ${task.status}`);
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

function filterByStatus() {
    const filterSelect = document.getElementById('statusFilter');
    const selectedStatus = filterSelect.value; 
    const tableRows = document.querySelectorAll('#statusTable tbody tr');

    console.log('Status selecionado:', selectedStatus);

    tableRows.forEach(row => {
        const statusCell = row.querySelector('.status');
        if (!statusCell) {
            console.log('Célula de status não encontrada');
            return;
        }

        // Obtenha o status atual, removendo acentos e convertendo para minúsculas
        const currentStatus = statusCell.textContent.trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        console.log('Status da linha:', currentStatus);

        // Se o status selecionado for 'all', mostre todas as linhas
        if (selectedStatus === 'all') {
            row.style.display = ''; // Mostra a linha
            console.log('Mostrando todas as linhas');
        } else {
            // Verifique se o status atual corresponde ao status selecionado
            if (currentStatus === selectedStatus.toLowerCase()) {
                row.style.display = ''; // Mostra a linha
                console.log(`Mostrando linha com status ${currentStatus}`);
            } else {
                row.style.display = 'none'; // Oculta a linha
                console.log(`Ocultando linha com status ${currentStatus}`);
            }
        }
    });
}

// Adiciona o event listener quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterByStatus);
        console.log('Event listener adicionado ao filtro de status');
    } else {
        console.log('Elemento statusFilter não encontrado');
    }
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

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    
    // Elementos da interface
    const searchButton = document.querySelector('.search-button');
    const searchInput = document.querySelector('.search');
    const statusButton = document.querySelector('.status-button');
    const statusSelect = document.querySelector('.status-select');
    const statusFilter = document.getElementById('statusFilter');
    
    // Inicializações
    setupPagination();
    updateExecutionTable();
    
    // Event Listeners
    if (statusFilter) {
        statusFilter.addEventListener('change', filterByStatus);
    }

    if (searchButton) {
        searchButton.addEventListener('click', function(e) {
            e.stopPropagation();
            searchInput.classList.toggle('active');
            statusSelect.classList.remove('active');
            if (searchInput.classList.contains('active')) {
                searchInput.focus();
            }
        });
    }

    if (statusButton) {
        statusButton.addEventListener('click', function(e) {
            e.stopPropagation();
            statusSelect.classList.toggle('active');
            searchInput.classList.remove('active');
        });
    }

    // Função de pesquisa
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('#statusTable tbody tr');
            
            rows.forEach(row => {
                const taskName = row.querySelector('.namecolumn').textContent.toLowerCase();
                row.style.display = taskName.includes(searchTerm) ? '' : 'none';
            });
        });
    }

    // Fechar campos quando clicar fora
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.search-wrapper')) {
            searchInput.classList.remove('active');
            searchInput.value = '';
            const rows = document.querySelectorAll('#statusTable tbody tr');
            rows.forEach(row => row.style.display = '');
        }
        if (!event.target.closest('.status-wrapper')) {
            statusSelect.classList.remove('active');
        }
    });

    // Iniciar monitoramento e atualizações periódicas
    setInterval(updateExecutionTable, 2000);
    
    // Atualização de status das tarefas
    setInterval(() => {
        fetch('/task_status')
            .then(response => response.json())
            .then(data => {
                updateTaskStatus(data);
                orderbytable();
            })
            .catch(error => console.error('Erro ao atualizar status das tarefas:', error));
    }, 1000);

    // Eventos do Modal
    const modal = document.getElementById("addTaskModal");
    const addTaskBtn = document.getElementById("addTaskBtn");
    const closeBtn = document.getElementsByClassName("close")[0];

    if (addTaskBtn) {
        addTaskBtn.onclick = function() {
            modal.style.display = "block";
        }
    }

    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.style.display = "none";
            resetForm();
        }
    }

    // Fechar modal ao clicar fora
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
            resetForm();
        }
    }

    // Formatação do campo de horário
    const taskTimeInput = document.getElementById('taskTime');
    if (taskTimeInput) {
        taskTimeInput.addEventListener('input', function(e) {
            let value = e.target.value;
            value = value.replace(/[^0-9:]/, '');
            if (value.length > 5) value = value.substr(0, 5);
            e.target.value = value;
        });
    }

    // Configuração do formulário de adição de tarefas
    const addTaskForm = document.getElementById("addTaskForm");
    if (addTaskForm) {
        const newForm = addTaskForm.cloneNode(true);
        addTaskForm.parentNode.replaceChild(newForm, addTaskForm);

        newForm.addEventListener("submit", function(e) {
            e.preventDefault();
            handleFormSubmit(e);
        });
    }

    // Prevenir Ctrl+S
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            event.stopPropagation();
        }
    });
});

// Função auxiliar para lidar com o envio do formulário
function handleFormSubmit(e) {
    const name = document.getElementById("taskName").value.trim();
    const time = document.getElementById("taskTime").value.trim();
    const path = document.getElementById("taskPath").value.trim();
    const nameError = document.getElementById("nameError");
    const timeError = document.getElementById("timeError");
    const pathError = document.getElementById("pathError");

    // Limpar mensagens de erro
    nameError.style.display = "none";
    timeError.style.display = "none";
    pathError.style.display = "none";

    // Validações
    if (!path.toLowerCase().endsWith('.exe')) {
        pathError.textContent = "O caminho deve apontar para um arquivo .exe";
        pathError.style.display = "block";
        return;
    }

    // Verificar duplicatas
    const nameExists = Array.from(document.querySelectorAll('#statusTable tbody tr td:first-child'))
        .some(td => td.textContent.trim() === name);
    const timeExists = Array.from(document.querySelectorAll('#statusTable tbody tr td:nth-child(3)'))
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

    // Enviar formulário
    fetch('/add_task', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, time, path }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Tarefa adicionada com sucesso:', data.message);
            addTaskToTable(data.task);
            document.getElementById("addTaskModal").style.display = "none";
            resetForm();
        } else {
            console.error('Erro ao adicionar tarefa:', data.message);
            alert('Ocorreu um erro ao adicionar a tarefa: ' + data.message);
        }
    })
    .catch((error) => {
        console.error('Erro:', error);
        alert('Ocorreu um erro inesperado.');
    });
}

// Modal e Formulário
var modal = document.getElementById("addTaskModal");
var btn = document.getElementById("addTaskBtn");
var span = document.getElementsByClassName("close")[0];

// Função para limpar o formulário e remover alertas
function resetForm() {
    document.getElementById('addTaskForm').reset();
    document.getElementById('nameError').textContent = '';
    document.getElementById('timeError').textContent = '';
    document.getElementById('pathError').textContent = '';
    document.getElementById('nameError').style.display = 'none';
    document.getElementById('timeError').style.display = 'none';
    document.getElementById('pathError').style.display = 'none';
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

// Formatação do campo de horário
document.getElementById('taskTime').addEventListener('input', function(e) {
    let value = e.target.value;
    value = value.replace(/[^0-9:]/, '');
    if (value.length > 5) value = value.substr(0, 5);
    e.target.value = value;
});

// Paginação
function setupPagination() {
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

    function updatePagination() {
        const pageCount = Math.ceil(filteredRows.length / rowsPerPage);
        pagination.innerHTML = '';

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.classList.add('pagination-btn');
            btn.addEventListener('click', () => {
                currentPage = i;
                displayRows();
                updatePaginationButtons();
            });
            pagination.appendChild(btn);
        }
    }

    function updatePaginationButtons() {
        const buttons = pagination.querySelectorAll('.pagination-btn');
        buttons.forEach((btn, index) => {
            btn.classList.toggle('active', index + 1 === currentPage);
        });
    }

    // Inicialização da paginação
    sortRowsByTime();
    displayRows();
    updatePagination();
    updatePaginationButtons();
}

// Formulário de adição de tarefas
const form = document.getElementById("addTaskForm");
if (form) {
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener("submit", function(e) {
        e.preventDefault();
        var name = document.getElementById("taskName").value.trim();
        var time = document.getElementById("taskTime").value.trim();
        var path = document.getElementById("taskPath").value.trim();
        var nameError = document.getElementById("nameError");
        var timeError = document.getElementById("timeError");
        var pathError = document.getElementById("pathError");

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

        // Envio do formulário
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
                addTaskToTable(data.task);
                modal.style.display = "none";
                resetForm();
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
            <button title="Iniciar automação" class="iniciar" onclick="startTask('${task.name}')">
                <i class="fas fa-play"></i>
            </button>
        </td>
    `;

    orderbytable();
}

// Prevenir Ctrl+S
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        event.stopPropagation();
    }
});