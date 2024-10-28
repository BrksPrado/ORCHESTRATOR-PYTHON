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
    db = client['SGDB']
    collection = db['orchestrator']
    print("MongoDB connection successful!")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")

app = Flask(__name__)

def execute_task(task_name):
    print(f"Executando tarefa: {task_name}")
    for task in tasks:
        if isinstance(task, dict) and task.get('name') == task_name:
            try:
                start_time = datetime.now()
                task['status'] = 'Executando'
                task['execution_time'] = start_time.strftime("%H:%M:%S")
                task['completion_time'] = ''
                
                executable_path = task.get('path', '')
                if executable_path.endswith('.exe'):
                    executable_path = executable_path[:-4]

                # Verifique se o arquivo existe
                if not os.path.isfile(executable_path + '.exe'):
                    print(f"Arquivo não encontrado: {executable_path}.exe")
                    task['status'] = 'Erro'
                    task['execution_time'] = ''
                    end_time = datetime.now()
                    # Salva no MongoDB apenas o status de erro
                    save_to_mongodb(task, start_time, end_time, end_time - start_time)
                    return task

                # Adiciona um delay antes da execução
                time.sleep(2)  # Aguarda 2 segundos antes de executar

                # Executa o arquivo
                process = subprocess.run([executable_path + '.exe'],
                                      stdout=subprocess.PIPE,
                                      stderr=subprocess.PIPE,
                                      check=True)

                # Adiciona um delay após a execução
                time.sleep(2)  # Aguarda 2 segundos após executar

                # Atualiza o status e horário de finalização
                end_time = datetime.now()
                task['status'] = 'Concluída'
                task['completion_time'] = end_time.strftime("%H:%M:%S")
                
                # Salva no MongoDB apenas o status final
                save_to_mongodb(task, start_time, end_time, end_time - start_time)
                return task

            except subprocess.CalledProcessError as e:
                print(f"Erro na execução: {e.stderr.decode()}")
                task['status'] = 'Erro'
                task['execution_time'] = ''
                task['completion_time'] = ''
                end_time = datetime.now()
                # Salva no MongoDB apenas o status de erro
                save_to_mongodb(task, start_time, end_time, end_time - start_time)
                return task
            except Exception as e:
                print(f"Erro inesperado: {str(e)}")
                task['status'] = 'Erro'
                task['execution_time'] = ''
                task['completion_time'] = ''
                end_time = datetime.now()
                # Salva no MongoDB apenas o status de erro
                save_to_mongodb(task, start_time, end_time, end_time - start_time)
                return task
    return None

def save_to_mongodb(task, start_time, end_time, execution_time):
    try:
        document = {
            'id_automacao': task['id'],
            'nome_automacao': task['name'],
            'status_final': task['status'],
            'horario_agendado': task.get('original_time', task['time']),
            'caminho_arquivo': task.get('path', ''),
            'horario_inicio': start_time.strftime("%d/%m/%Y -- %H:%M:%S") if start_time else ''
        }

        if end_time:
            document['horario_fim'] = end_time.strftime("%d/%m/%Y -- %H:%M:%S")
            if execution_time:
                hours, remainder = divmod(execution_time.seconds, 3600)
                minutes, seconds = divmod(remainder, 60)
                document['tempo_de_execucao'] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        
        if task['status'] == 'Erro':
            document['erro'] = "Erro na execução da tarefa"

        collection.insert_one(document)
        print(f"Task '{task['name']}' saved to MongoDB.")
    except Exception as e:
        print(f"Error saving task to MongoDB: {e}")

def monitor_tasks():
    while True:
        try:
            current_time = datetime.now()
            for task in tasks:
                if isinstance(task, dict):
                    task_time = task.get('time', '')
                    if task_time:
                        # Converte o horário da tarefa para datetime
                        task_hours, task_minutes = map(int, task_time.split(':'))
                        if (current_time.hour == task_hours and 
                            current_time.minute == task_minutes and
                            current_time.second == 0 and
                            task.get('status') == 'Pendente' and
                            not task.get('is_new', False)):
                            print(f"Iniciando tarefa agendada: {task.get('name')} às {task_time}")
                            execute_task(task.get('name'))
            
            # Aguarda até o próximo segundo
            time.sleep(1 - datetime.now().microsecond/1000000.0)
        except Exception as e:
            print(f"Error in monitor_tasks: {str(e)}")
            time.sleep(1)

@app.route('/')
def index():
    return render_template('index.html', tasks=tasks)

@app.route('/start_task', methods=['POST'])
def start_task():
    try:
        data = request.json
        task_name = data.get('task_name')
        if not task_name:
            return jsonify({"error": "task_name is required"}), 400
        
        task = execute_task(task_name)
        if task:
            return jsonify({"success": True, "task": task})
        return jsonify({"error": "Task not found"}), 404
    except Exception as e:
        print(f"Erro ao iniciar tarefa: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/stop_task', methods=['POST'])
def stop_task():
    try:
        data = request.json
        task_name = data.get('task_name')
        if not task_name:
            return jsonify({"error": "task_name is required"}), 400
        
        for task in tasks:
            if task.get('name') == task_name:
                if task.get('status') == 'Executando':
                    task['status'] = 'Pendente'
                    # Restaura o horário original quando parar
                    if 'original_time' in task:
                        task['time'] = task['original_time']
                    return jsonify({"success": True, "task": task})
        
        return jsonify({"error": "Task not found or not running"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/task_status', methods=['GET'])
def task_status():
    try:
        for task in tasks:
            if isinstance(task, dict):
                latest_status = collection.find_one(
                    {'id_automacao': task.get('id')}, 
                    sort=[('horario_fim', -1)]
                )
                if latest_status:
                    # Não atualizar o status se for uma tarefa recém-adicionada
                    if task.get('status') == 'Pendente' and not task.get('execution_time'):
                        continue
                    task['status'] = latest_status['status_final']
                    if task['status'] == 'Executando':
                        task['time'] = task.get('execution_start_time', task['time'])
                    else:
                        horario_fim = latest_status.get('horario_fim', '')
                        if horario_fim:
                            task['completion_time'] = horario_fim.split('--') [-1].strip()
        return jsonify({'tasks': tasks})
    except Exception as e:
        print(f"Erro ao atualizar status: {str(e)}")
        return jsonify({"success": False, "message": f"Erro ao atualizar status: {str(e)}"}), 500

@app.route('/add_task', methods=['POST'])
def add_task():
    try:
        data = request.json
        task_name = data.get('name')
        task_time = data.get('time')
        task_path = data.get('path')
        
        if not task_name or not task_time or not task_path:
            return jsonify({"success": False, "message": "Todos os campos são obrigatórios"}), 400

        # Remove a extensão .exe do caminho
        if task_path.endswith('.exe'):
            task_path = task_path[:-4]

        # Verificar se já existe uma tarefa com o mesmo nome ou horário
        for task in tasks:
            if task.get('name') == task_name:
                return jsonify({"success": False, "message": "Já existe uma tarefa com este nome"}), 400
            if task.get('time') == task_time:
                return jsonify({"success": False, "message": "Já existe uma tarefa agendada para este horário"}), 400

        new_task = {
            'id': len(tasks) + 1,
            'name': task_name,
            'time': task_time,
            'path': task_path,
            'status': 'Pendente',
            'execution_time': '',
            'completion_time': '',
            'original_time': task_time,
            'is_new': True  # Adiciona flag de nova tarefa
        }
        tasks.append(new_task)

        # Remove o flag após alguns segundos
        def remove_new_flag():
            time.sleep(5)
            new_task['is_new'] = False

        threading.Thread(target=remove_new_flag).start()

        # Salvar no MongoDB com status inicial
        try:
            document = {
                'id_automacao': new_task['id'],
                'nome_automacao': new_task['name'],
                'status_final': 'Pendente',
                'horario_agendado': new_task['time'],
                'caminho_arquivo': new_task['path'],
                'horario_inicio': '',
                'horario_fim': '',
                'is_new': True  # Adiciona flag no documento do MongoDB
            }
            collection.insert_one(document)
        except Exception as e:
            print(f"Erro ao salvar no MongoDB: {e}")

        # Atualizar o arquivo lista.py
        with open('lista.py', 'w', encoding='utf-8') as file:
            file.write("tasks = []\n")
            for task in tasks:
                file.write(f"tasks.append({{'id': {task['id']}, 'name': '{task['name']}', "
                          f"'time': '{task['time']}', 'path': r'{task['path']}', "
                          f"'status': 'Pendente'}})\n")

        return jsonify({"success": True, "task": new_task})
        
    except Exception as e:
        print(f"Erro ao adicionar tarefa: {str(e)}")
        return jsonify({"success": False, "message": f"Erro ao adicionar tarefa: {str(e)}"}), 500

@app.route('/get_tasks', methods=['GET'])
def get_tasks():
    try:
        # Retorna a lista de tarefas atualizada
        return jsonify({'tasks': tasks})
    except Exception as e:
        print(f"Erro ao obter tarefas: {str(e)}")
        return jsonify({"success": False, "message": f"Erro ao obter tarefas: {str(e)}"}), 500

if __name__ == '__main__':
    threading.Thread(target=monitor_tasks).start()
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)