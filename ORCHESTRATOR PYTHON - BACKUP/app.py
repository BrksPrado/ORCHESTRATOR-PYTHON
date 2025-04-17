import threading
import time
import subprocess
import random
from flask import Flask, render_template, request, jsonify
from datetime import datetime
from pymongo import MongoClient
import os
import logging
import json

# Função para carregar automações do arquivo JSON
def carregar_automacoes():
    try:
        with open('automacoes.json', 'r', encoding='utf-8') as file:
            automacoes = json.load(file)
            # Resetar status das tarefas ao carregar
            for task in automacoes:
                task['status'] = 'Pendente'
                task['execution_time'] = ''
                task['completion_time'] = ''
    except FileNotFoundError:
        automacoes = []
    return automacoes

# Função para salvar automações no arquivo JSON
def salvar_automacoes(automacoes):
    with open('automacoes.json', 'w',encoding='utf-8') as file:
        json.dump(automacoes, file, indent=4)

# Carregar automações no inícios
tasks = carregar_automacoes()

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
    logging.info(f"Executando tarefa: {task_name}")
    for task in tasks:
        if isinstance(task, dict) and task.get('name') == task_name:
            try:
                start_time = datetime.now()
                task['status'] = 'Executando'
                task['execution_time'] = start_time.strftime("%H:%M:%S")
                task['completion_time'] = ''

                executable_path = task.get('path')

                # Verifique se o arquivo existe
                if not os.path.isfile(executable_path):
                    logging.error(f"Arquivo não encontrado: {executable_path}")
                    task['status'] = 'Erro'
                    task['execution_time'] = ''
                    end_time = datetime.now()
                    save_to_mongodb(task, start_time, end_time, end_time - start_time,"Arquivo não existe")
                    salvar_automacoes(tasks)  # Salvar estado atualizado
                    return task

                # Adiciona um delay antes da execução
                time.sleep(2)  # Aguarda 2 segundos antes de executar

                logging.info(f"Executando: {executable_path}")

                # Executa o arquivo
                process = subprocess.Popen(
                    [executable_path],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True  # Para garantir que a saída seja tratada como texto
                )
                task['status'] = 'Executando'

                # Ler a saída em tempo real
                while True:
                    output = process.stdout.readline()
                    if output == '' and process.poll() is not None:
                        break
                    if output:
                        logging.info(output.strip())

                # Verificar se houve algum erro
                stderr_output = process.stderr.read()
                if stderr_output:
                    logging.error(f"Erros encontrados:\n{stderr_output}")
                    task['status'] = 'Erro'
                else:
                    # Verificar o código de retorno do processo
                    return_code = process.poll()
                    if return_code is None:
                        logging.error("Processo foi interrompido")
                        task['status'] = 'Pendente'
                    elif return_code == -9:  # Código de retorno típico para processos finalizados à força
                        logging.error(f"Processo finalizado à força com código de retorno: {return_code}")
                        task['status'] = 'Pendente'
                    elif return_code != 0:
                        logging.error(f"Processo finalizado com código de retorno: {return_code}")
                        task['status'] = 'Erro'
                    else:
                        task['status'] = 'Concluída'

                # Adiciona um delay após a execução
                time.sleep(2)  # Aguarda 2 segundos após executar

                # Atualiza o horário de finalização
                end_time = datetime.now()
                task['completion_time'] = end_time.strftime("%H:%M:%S")
                save_to_mongodb(task, start_time, end_time, end_time - start_time)
                salvar_automacoes(tasks)  # Salvar estado atualizado

            except Exception as e:
                logging.error(f"Ocorreu um erro: {str(e)}")
                task['status'] = 'Erro'
                end_time = datetime.now()
                save_to_mongodb(task, start_time, end_time, end_time - start_time,error=e)
                salvar_automacoes(tasks)  # Salvar estado atualizado
                return task

def save_to_mongodb(task, start_time, end_time, execution_time,error="None"):
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
            document['erro'] = error

        collection.insert_one(document)
        print(f"Task '{task['name']}' saved to MongoDB.")
    except Exception as e:
        print(f"Error saving task to MongoDB: {e}")

#__Função princial__ gerencia
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

# Rota para iniciar uma tarefa
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

# Rota para parar uma tarefa
@app.route('/stop_task', methods=['POST'])
def stop_task():
    print("Em Desenvolvimento")
    

# Função para remover uma tarefa da lista
def remove_task_from_list(task_name):
    try:
        global tasks
        initial_length = len(tasks)
        tasks = [task for task in tasks if task["name"] != task_name]
        final_length = len(tasks)

        # Verificar se a tarefa foi removida
        if initial_length == final_length:
            return False  # Tarefa não encontrada

        salvar_automacoes(tasks)  # Salvar estado atualizado
        print("Removido!")
        return True
    except Exception as e:
        print(f"Erro ao remover tarefa: {e}")
        return False

# Rota para remover uma tarefa
@app.route('/remove_task', methods=['POST'])
def remove_task():
    try:
        data = request.json
        task_name = data.get('task_name')
        print(f"Nome da tarefa recebida: {task_name}")

        if not task_name:
            return jsonify({"error": "Nome da tarefa não fornecido"}), 400

        # Chamada da função remove_task_from_list
        if remove_task_from_list(task_name):
            return jsonify({"message": "Tarefa removida com sucesso"}), 200
        else:
            return jsonify({"error": "Nome da tarefa não encontrado"}), 404
    except Exception as e:
        print(f"Erro ao remover tarefa: {e}")
        return jsonify({"error": "Erro ao remover tarefa"}), 500

# Rota para adicionar uma nova tarefa
@app.route('/add_task', methods=['POST'])
def add_task():
    try:
        data = request.json
        task_name = data.get('name')
        task_time = data.get('time')
        task_path = data.get('path')
        
        if not task_name or not task_time or not task_path:
            return jsonify({"success": False, "message": "Todos os campos são obrigatórios"}), 400

        # Verificar se já existe uma tarefa com o mesmo nome ou horário
        for task in tasks:
            if task.get('name') == task_name:
                return jsonify({"success": False, "message": "Já existe uma tarefa com este nome!"}), 400
            if task.get('time') == task_time:
                return jsonify({"success": False, "message": "Já existe uma tarefa com este horário!"}), 400

        new_task = {
            'id': len(tasks) + 1,
            'name': task_name,
            'time': task_time,
            'path': task_path,
            'status': 'Pendente',
            'execution_time': '',
            'completion_time': '',
            'original_time': task_time,
            'is_new': False  # Adiciona flag de nova tarefa
        }
        tasks.append(new_task)

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
                'is_new': False  # Adiciona flag no documento do MongoDB
            }
            collection.insert_one(document)
        except Exception as e:
            print(f"Erro ao salvar no MongoDB: {e}")

        salvar_automacoes(tasks)  # Salvar estado atualizado

        return jsonify({"success": True, "task": new_task})
        
    except Exception as e:
        print(f"Erro ao adicionar tarefa: {str(e)}")
        return jsonify({"success": False, "message": f"Erro ao adicionar tarefa: {str(e)}"}), 500

# Rota para obter a lista de tarefas
@app.route('/get_tasks', methods=['GET'])
def get_tasks():
    try:
        # Retorna a lista de tarefas atualizada
        return jsonify({'tasks': tasks})
    except Exception as e:
        print(f"Erro ao obter tarefas: {str(e)}")
        return jsonify({"success": False, "message": f"Erro ao obter tarefas: {str(e)}"}), 500
    
@app.route('/historico')
def Historico():
    return render_template('index_execucoes.html')


if __name__ == '__main__':
    threading.Thread(target=monitor_tasks).start()
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)