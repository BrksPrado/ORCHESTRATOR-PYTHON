import threading
import time
import subprocess
import random
from flask import Flask, render_template, request, jsonify
from datetime import datetime
from pymongo import MongoClient
from lista import tasks
import os

# Conexão com o MongoDB
try:
    client = MongoClient('mongodb://localhost:27017/')
    client.admin.command('ping')
    print("MongoDB connection successful!")
except Exception as e:
    print(f"MongoDB connection failed: {e}")

db = client['SGDB']
collection = db['orchestrator']

app = Flask(__name__)

def execute_task(task_name):
    print(f"Executando tarefa: {task_name}")
    for task in tasks:
        if task['name'] == task_name:
            try:
                # Registra o horário de início
                start_time = datetime.now()
                task['status'] = 'Executando'
                task['execution_start_time'] = start_time.strftime("%H:%M:%S")
                task['original_time'] = task['time']  # Guarda o horário original
                task['time'] = start_time.strftime("%H:%M:%S")  # Atualiza com horário atual
                
                executable_path = task['path']
                if executable_path.endswith('.exe'):
                    executable_path = executable_path[:-4]
                
                if not os.path.isfile(executable_path + '.exe'):
                    print(f"Arquivo não encontrado: {executable_path}.exe")
                    task['status'] = 'Erro: Arquivo não encontrado'
                    end_time = datetime.now()
                    save_to_mongodb(task, start_time, end_time, end_time - start_time)
                    return task
                
                # Executa o arquivo
                process = subprocess.run([executable_path + '.exe'],
                                      stdout=subprocess.PIPE,
                                      stderr=subprocess.PIPE,
                                      check=True)
                
                # Registra o horário de término
                end_time = datetime.now()
                task['status'] = 'Concluída'
                task['completion_time'] = end_time.strftime("%H:%M:%S")
                
                # Salva no MongoDB
                save_to_mongodb(task, start_time, end_time, end_time - start_time)
                print(process.stdout.decode())

            except subprocess.CalledProcessError as e:
                end_time = datetime.now()
                task['status'] = 'Erro'
                task['completion_time'] = end_time.strftime("%H:%M:%S")
                save_to_mongodb(task, start_time, end_time, end_time - start_time)
                print(f"Erro na execução: {e.stderr.decode()}")
            except Exception as e:
                end_time = datetime.now()
                task['status'] = 'Erro'
                task['completion_time'] = end_time.strftime("%H:%M:%S")
                save_to_mongodb(task, start_time, end_time, end_time - start_time)
                print(f"Erro inesperado: {str(e)}")
            break
    return task

def save_to_mongodb(task, start_time, end_time, execution_time):
    try:
        document = {
            'id_automacao': task['id'],
            'nome_automacao': task['name'],
            'status_final': task['status'],
            'horario_inicio_execucao': start_time.strftime("%H:%M:%S"),
            'horario_agendado': task.get('original_time', task['time']),
            'caminho_arquivo': task.get('path', ''),
            'horario_inicio': start_time.strftime("%d/%m/%Y -- %H:%M:%S"),
            'horario_fim': end_time.strftime("%d/%m/%Y -- %H:%M:%S"),
            'tempo_execucao': str(execution_time),
            'completion_time': task.get('completion_time', '')
        }

        if task['status'] == 'Erro':
            document['erro'] = "Erro na execução da tarefa"

        # Verifica a conexão com o MongoDB antes de inserir
        try:
            client.admin.command('ping')
            collection.insert_one(document)
            print(f"Task '{task['name']}' saved to MongoDB successfully.")
        except Exception as mongo_error:
            print(f"MongoDB connection error: {mongo_error}")
            
    except Exception as e:
        print(f"Error saving task to MongoDB: {e}")

def monitor_tasks():
    while True:
        current_time = datetime.now().strftime("%H:%M")
        for task in tasks:
            if task['time'] == current_time and task['status'] == 'Pendente':
                execute_task(task['name'])
        time.sleep(60)

@app.route('/')
def index():
    return render_template('index.html', tasks=tasks)

@app.route('/start_task', methods=['POST'])
def start_task():
    data = request.json
    task_name = data.get('task_name')
    if not task_name:
        return jsonify({"error": "task_name is required"}), 400
    
    task = execute_task(task_name)
    return jsonify({"task": task})

@app.route('/task_status', methods=['GET'])
def task_status():
    current_tasks = []
    for task in tasks:
        task_copy = task.copy()
        latest_status = collection.find_one(
            {'id_automacao': task['id']}, 
            sort=[('horario_fim', -1)]
        )
        
        if latest_status:
            task_copy['status'] = latest_status['status_final']
            if task_copy['status'] == 'Executando':
                task_copy['time'] = latest_status['horario_inicio_execucao']
            else:
                task_copy['time'] = task.get('time')
                task_copy['completion_time'] = latest_status.get('completion_time', '')
        
        current_tasks.append(task_copy)
    
    return jsonify(current_tasks)

@app.route('/add_task', methods=['POST'])
def add_task():
    global tasks
    data = request.json
    task_name = data.get('name')
    task_time = data.get('time')
    task_path = data.get('path')

    print(f"Recebendo dados para adicionar tarefa: {data}")  # Log de depuração

    if not task_name or not task_time or not task_path:
        print("Erro: Todos os campos são obrigatórios")  # Log de depuração
        return jsonify({"success": False, "message": "Todos os campos são obrigatórios"}), 400

    # Verificar se já existe uma tarefa com o mesmo nome
    for task in tasks:
        if task['name'] == task_name:
            print("Erro: Já existe uma tarefa com este nome")  # Log de depuração
            return jsonify({"success": False, "message": "Já existe uma tarefa com este nome"}), 400

    new_task = {
        'id': len(tasks) + 1,
        'name': task_name,
        'time': task_time,
        'path': task_path,
        'status': 'Pendente'
    }
    tasks.append(new_task)

    # Adicionar a nova tarefa ao arquivo lista.py
    try:
        with open('lista.py', 'w') as file:
            file.write("tasks = []\n")
            file.write("tasks.append([\n")
            for task in tasks:
                file.write(f"    {task},\n")
            file.write("])\n")
        print(f"Tarefa adicionada com sucesso: {new_task}")  # Log de depuração
    except Exception as e:
        print(f"Erro ao adicionar tarefa ao arquivo lista.py: {e}")  # Log de depuração
        return jsonify({"success": False, "message": "Erro ao adicionar tarefa ao arquivo lista.py"}), 500

    return jsonify({"success": True, "message": "Tarefa adicionada com sucesso"})

if __name__ == '__main__':
    threading.Thread(target=monitor_tasks).start()
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)