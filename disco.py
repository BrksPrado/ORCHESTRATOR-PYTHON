import psutil
import tkinter as tk
from tkinter import ttk

def update_disk_usage():
    # Obter o uso de disco
    disk_usage = psutil.disk_usage('/')
    total_space = disk_usage.total / (1024 ** 3)  # Converte para GB
    used_space = disk_usage.used / (1024 ** 3)  # Converte para GB
    free_space = disk_usage.free / (1024 ** 3)  # Converte para GB
    percent_used = disk_usage.percent

    # Atualizar o texto na interface
    total_label.config(text=f"Espaço Total: {total_space:.2f} GB")
    used_label.config(text=f"Espaço Usado: {used_space:.2f} GB")
    free_label.config(text=f"Espaço Livre: {free_space:.2f} GB")
    percent_label.config(text=f"Porcentagem Usada: {percent_used}%")

    # Atualizar a barra de progresso
    progress_bar['value'] = percent_used

    # Atualizar a cada segundo
    root.after(1000, update_disk_usage)

# Configurar a interface gráfica
root = tk.Tk()
root.title("Monitor de Uso de Disco")
root.geometry("300x200")

# Labels para exibir as informações
total_label = tk.Label(root, text="Espaço Total: ")
total_label.pack(pady=5)
used_label = tk.Label(root, text="Espaço Usado: ")
used_label.pack(pady=5)
free_label = tk.Label(root, text="Espaço Livre: ")
free_label.pack(pady=5)
percent_label = tk.Label(root, text="Porcentagem Usada: ")
percent_label.pack(pady=5)

# Barra de progresso para mostrar o uso do disco
progress_bar = ttk.Progressbar(root, orient="horizontal", length=250, mode="determinate")
progress_bar.pack(pady=10)

# Iniciar a atualização
update_disk_usage()

# Executar a interface
root.mainloop()
