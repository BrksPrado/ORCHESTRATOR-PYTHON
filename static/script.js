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
        console.log('Resposta do servidor:', data);
        if (data.task) {
            const taskElement = document.querySelector(`tr[data-task-id="${data.task.id}"]`);
            if (taskElement) {
                const statusCell = taskElement.querySelector('.status');
                statusCell.textContent = data.task.status;
                statusCell.className = `status ${getStatusClass(data.task.status)}`;

                const executionTimeCell = taskElement.querySelector('.execution-time');
                executionTimeCell.textContent = data.task.execution_time || '';

                const completionTimeCell = taskElement.querySelector('.completion-time');
                completionTimeCell.textContent = data.task.completion_time || '';

                const buttonCell = taskElement.querySelector('.cellbutton');
                if (data.task.status === 'Executando') {
                    buttonCell.innerHTML = `
                        <button title="Parar automação" class="parar" onclick="stopTask('${data.task.name}')">
                            <i class="fas fa-stop"></i>
                        </button>
                    `;
                } else {
                    buttonCell.innerHTML = `
                        <button title="Iniciar automação" class="iniciar" onclick="startTask('${data.task.name}')">
                            <i class="fas fa-play"></i>
                        </button>
                    `;
                }
            }
        }
    })
    .catch(error => {
        console.error('Erro ao iniciar tarefa:', error);
    });
}

function updateTaskStatus(tasks) {
    tasks.forEach(task => {
        const taskElement = document.querySelector(`tr[data-task-id="${task.id}"]`);
        if (taskElement) {
            // Não atualizar o status se a tarefa foi recém-adicionada
            const isNewTask = taskElement.getAttribute('data-new-task') === 'true';
            if (isNewTask) {
                console.log('Pulando atualização de nova tarefa:', task.name);
                return;
            }

            const statusCell = taskElement.querySelector('.status');
            const triggerCell = taskElement.querySelector('.trigger-time');
            const executionTimeCell = taskElement.querySelector('.execution-time');
            const completionTimeCell = taskElement.querySelector('.completion-time');
            const buttonCell = taskElement.querySelector('.cellbutton');

            // Atualiza o status apenas se não for uma nova tarefa
            statusCell.textContent = task.status;
            statusCell.className = `status ${getStatusClass(task.status)}`;

            // Atualiza o horário agendado
            triggerCell.textContent = task.time;

            // Atualiza os horários apenas se necessário
            if (task.status === 'Executando' || task.status === 'Concluída') {
                executionTimeCell.textContent = task.execution_time || '';
            }

            if (task.status === 'Concluída') {
                completionTimeCell.textContent = task.completion_time || '';
            }

            // Atualiza o botão baseado no status
            if (task.status === 'Executando') {
                buttonCell.innerHTML = `
                    <button title="Parar automação" class="parar" onclick="stopTask('${task.name}')">
                        <i class="fas fa-stop"></i>
                    </button>
                `;
            } else {
                buttonCell.innerHTML = `
                    <button title="Iniciar automação" class="iniciar" onclick="startTask('${task.name}')">
                        <i class="fas fa-play"></i>
                    </button>
                `;
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
        const timeA = a.querySelector('.trigger-time').textContent.trim();
        const timeB = b.querySelector('.trigger-time').textContent.trim();
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

        const currentStatus = statusCell.textContent.trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        console.log('Status da linha:', currentStatus);

        if (selectedStatus === 'all') {
            row.style.display = '';
            console.log('Mostrando todas as linhas');
        } else {
            if (currentStatus === selectedStatus.toLowerCase()) {
                row.style.display = '';
                console.log(`Mostrando linha com status ${currentStatus}`);
            } else {
                row.style.display = 'none';
                console.log(`Ocultando linha com status ${currentStatus}`);
            }
        }
    });
}

function stopTask(taskName) {
    fetch('/stop_task', {
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
                statusCell.textContent = 'Pendente';
                statusCell.className = 'status status-pendente';

                // Limpa os horários
                const executionTimeCell = taskElement.querySelector('.execution-time');
                executionTimeCell.textContent = '';
                
                const completionTimeCell = taskElement.querySelector('.completion-time');
                completionTimeCell.textContent = '';

                // Atualiza o botão para iniciar
                const buttonCell = taskElement.querySelector('.cellbutton');
                buttonCell.innerHTML = `
                    <button title="Iniciar automação" class="iniciar" onclick="startTask('${data.task.name}')">
                        <i class="fas fa-play"></i>
                    </button>
                `;
            }
        }
    })
    .catch(error => console.error('Erro:', error));
}

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
            startTimeCell.textContent = row. querySelector('.trigger-time').textContent;
            startTimeCell.style.border = 'none';

            const endTimeCell = newRow.insertCell(2);
            endTimeCell.textContent = row.querySelector('.completion-time').textContent;
            endTimeCell.style.border = 'none';
        }
    });

    if (!hasExecution) {
        const newRow = executionTable.insertRow();
        newRow.style.backgroundColor = '#048e04';
        newRow.style.color = '#ffffff';

        const descriptionCell = newRow.insertCell(0);
        descriptionCell.textContent = 'Nenhuma automação em execução';
        descriptionCell.style.border = 'none';
        descriptionCell.colSpan = 3;
    }
}

// Função para atualizar a tabela de histórico
function updateHistoryTable() {
    const statusTable = document.getElementById('statusTable');
    const historyTable = document.getElementById('historytable').getElementsByTagName('tbody')[0];

    historyTable.innerHTML = '';

    Array.from(statusTable.getElementsByTagName('tbody')[0].rows).forEach(row => {
        const statusCell = row.querySelector('.status');
        if (statusCell && statusCell.textContent.includes('Concluída')) {
            const newRow = historyTable.insertRow();

            newRow.style.backgroundColor = '#048e04';
            newRow.style.color = '#ffffff';

            const descriptionCell = newRow.insertCell(0);
            descriptionCell.textContent = row.querySelector('.namecolumn').textContent;
            descriptionCell.style.border = 'none';

            const startTimeCell = newRow.insertCell(1);
            startTimeCell.textContent = row.querySelector('.trigger-time').textContent;
            startTimeCell.style.border = 'none';

            const endTimeCell = newRow.insertCell(2);
            endTimeCell.textContent = row.querySelector('.completion-time').textContent;
            endTimeCell.style.border = 'none';
        }
    });
}

// Função para atualizar a tabela de erros
function updateErrorTable() {
    const statusTable = document.getElementById('statusTable');
    const errorTable = document.getElementById('errortable').getElementsByTagName('tbody')[0];

    errorTable.innerHTML = '';

    Array.from(statusTable.getElementsByTagName('tbody')[0].rows).forEach(row => {
        const statusCell = row.querySelector('.status');
        if (statusCell && statusCell.textContent.includes('Erro')) {
            const newRow = errorTable.insertRow();

            newRow.style.backgroundColor = '#048e04';
            newRow.style.color = '#ffffff';

            const descriptionCell = newRow.insertCell(0);
            descriptionCell.textContent = row.querySelector('.namecolumn').textContent;
            descriptionCell.style.border = 'none';

            const startTimeCell = newRow.insertCell(1);
            startTimeCell.textContent = row.querySelector('.trigger-time').textContent;
            startTimeCell.style.border = 'none';

            const endTimeCell = newRow.insertCell(2);
            endTimeCell.textContent = row.querySelector('.completion-time').textContent;
            endTimeCell.style.border = 'none';
        }
    });
}

// Função para atualizar a tabela de pendentes
function updatePendingTable() {
    const statusTable = document.getElementById('statusTable');
    const pendingTable = document.getElementById('pendingtable').getElementsByTagName('tbody')[0];

    pendingTable.innerHTML = '';

    Array.from(statusTable.getElementsByTagName('tbody')[0].rows).forEach(row => {
        const statusCell = row.querySelector('.status');
        if (statusCell && statusCell.textContent.includes('Pendente')) {
            const newRow = pendingTable.insertRow();

            newRow.style.backgroundColor = '#048e04';
            newRow.style.color = '#ffffff';

            const descriptionCell = newRow.insertCell(0);
            descriptionCell.textContent = row.querySelector('.namecolumn').textContent;
            descriptionCell.style.border = 'none';

            const startTimeCell = newRow.insertCell(1);
            startTimeCell.textContent = row.querySelector('.trigger-time').textContent;
            startTimeCell.style.border = 'none';

            const endTimeCell = newRow.insertCell(2);
            endTimeCell.textContent = row.querySelector('.completion-time').textContent;
            endTimeCell.style.border = 'none';
        }
    });
}

// Função para atualizar a tabela de status
function updateStatusTable() {
    fetch('/get_tasks')
        .then(response => response.json())
        .then(data => {
            const statusTable = document.getElementById('statusTable');
            const tbody = statusTable.querySelector('tbody');
            tbody.innerHTML = '';

            data.tasks.forEach(task => {
                const newRow = tbody.insertRow();

                const nameCell = newRow.insertCell(0);
                nameCell.textContent = task.name;
                nameCell.className = 'namecolumn';

                const statusCell = newRow.insertCell(1);
                statusCell.textContent = task.status;
                statusCell.className = `status ${getStatusClass(task.status)}`;

                const triggerCell = newRow.insertCell(2);
                triggerCell.textContent = task.time;

                const executionTimeCell = newRow.insertCell(3);
                executionTimeCell.textContent = task.execution_time || '';

                const completionTimeCell = newRow.insertCell(4);
                completionTimeCell.textContent = task.completion_time || '';

                const buttonCell = newRow .insertCell(5);
                if (task.status === 'Executando') {
                    buttonCell.innerHTML = `
                        <button title="Parar automação" class="parar" onclick="stopTask('${task.name}')">
                            <i class="fas fa-stop"></i>
                        </button>
                    `;
                } else {
                    buttonCell.innerHTML = `
                        <button title="Iniciar automação" class="iniciar" onclick="startTask('${task.name}')">
                            <i class="fas fa-play"></i>
                        </button>
                    `;
                }
            });

            orderbytable();
            filterByStatus();
            updateExecutionTable();
            updateHistoryTable();
            updateErrorTable();
            updatePendingTable();
        })
        .catch(error => console.error('Erro:', error));
}

// Inicializa a tabela de status
updateStatusTable();

// Atualiza a tabela de status a cada 5 segundos
setInterval(updateStatusTable, 5000);

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
    addTaskForm.addEventListener("submit", handleFormSubmit);
}
});

// Função para configurar a paginação
function setupPagination() {
    const rowsPerPage = 20;
    const table = document.getElementById('statusTable');
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const pagination = document.getElementById('pagination');
    let currentPage = 1;
    let filteredRows = rows;

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
            if (i === currentPage) {
                btn.classList.add('active');
            }
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
    displayRows();
    updatePagination();
}

// Função para lidar com o envio do formulário
function handleFormSubmit(e) {
    e.preventDefault();
    
    clearErrorMessages();
    
    const taskName = document.getElementById('taskName').value;
    const taskTime = document.getElementById('taskTime').value;
    const taskPath = document.getElementById('taskPath').value;
    
    let isValid = true;
    
    if (!taskName) {
        showError('nameError', 'Nome da automação é obrigatório');
        isValid = false;
    }
    
    if (!taskTime) {
        showError('timeError', 'Horário é obrigatório');
        isValid = false;
    }
    
    if (!taskPath) {
        showError('pathError', 'Caminho do executável é obrigatório');
        isValid = false;
    }
    
    if (!isValid) return;

    const formData = {
        name: taskName,
        time: taskTime,
        path: taskPath
    };

    fetch('/add_task', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const modal = document.getElementById('addTaskModal');
            modal.style.display = 'none';
            resetForm();
            
            const tbody = document.querySelector('#statusTable tbody');
            const newRow = document.createElement('tr');
            newRow.setAttribute('data-task-id', data.task.id);
            newRow.setAttribute('data-new-task', 'true');  // Marca como nova tarefa
            
            newRow.innerHTML = `
                <td class="namecolumn">${data.task.name}</td>
                <td class="status status-pendente">Pendente</td>
                <td class="trigger-time">${data.task.time}</td>
                <td class="execution-time"></td>
                <td class="completion-time"></td>
                <td class="cellbutton">
                    <button title="Iniciar automação" class="iniciar" onclick="startTask('${data.task.name}')">
                        <i class="fas fa-play"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(newRow);
            orderbytable();

            // Remove o marcador de nova tarefa após alguns segundos
            setTimeout(() => {
                newRow.removeAttribute('data-new-task');
            }, 5000);
        } else {
            showError('nameError', data.message);
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        showError('nameError', 'Erro ao adicionar tarefa');
    });
}

// Função para limpar mensagens de erro
function clearErrorMessages() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
        element.textContent = '';
    });
}

// Função para mostrar mensagem de erro
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
    }
}

// Função para resetar o formulário
function resetForm() {
    const form = document.getElementById('addTaskForm');
    if (form) {
        form.reset();
        clearErrorMessages();
    }
}