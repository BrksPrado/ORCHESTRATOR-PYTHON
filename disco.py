import psutil
import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from ttkbootstrap import Style

def update_disk_usage():
    # Obter o uso do disco
    disk_usage = psutil.disk_usage('/')
    total_space = disk_usage.total / (1024 ** 3)  # GB
    used_space = disk_usage.used / (1024 ** 3)    # GB
    free_space = disk_usage.free / (1024 ** 3)    # GB
    percent_used = disk_usage.percent

    # Atualizar texto na interface
    total_label.config(text=f"Espaço Total: {total_space:.2f} GB")
    used_label.config(text=f"Espaço Usado: {used_space:.2f} GB")
    free_label.config(text=f"Espaço Livre: {free_space:.2f} GB")
    percent_label.config(text=f"Porcentagem Usada: {percent_used}%")

    # Atualizar a barra de progresso
    progress_bar['value'] = percent_used

    # Repetir atualização
    root.after(500, update_disk_usage)

# Configurar interface com ttkbootstrap para tema moderno
style = Style(theme='darkly')  # Opções de tema: flatly, superhero, darkly, etc.
root = style.master
root.title("Monitor de Uso de Disco")
root.geometry("320x220")
root.resizable(False, False)

# Estilizando o frame principal
frame = ttk.Frame(root, padding=10, bootstyle="primary", relief=RAISED, borderwidth=3)
frame.pack(fill=BOTH, expand=TRUE, padx=10, pady=10)

# Labels estilizados
total_label = ttk.Label(frame, text="Espaço Total:", font=("Helvetica", 10, "bold"), bootstyle="info")
total_label.pack(pady=5)
used_label = ttk.Label(frame, text="Espaço Usado:", font=("Helvetica", 10, "bold"), bootstyle="info")
used_label.pack(pady=5)
free_label = ttk.Label(frame, text="Espaço Livre:", font=("Helvetica", 10, "bold"), bootstyle="info")
free_label.pack(pady=5)
percent_label = ttk.Label(frame, text="Porcentagem Usada:", font=("Helvetica", 10, "bold"), bootstyle="info")
percent_label.pack(pady=5)

# Barra de progresso com efeito 3D e arredondamento
progress_bar = ttk.Progressbar(
    frame,
    orient="horizontal",
    length=260,
    mode="determinate",
    bootstyle="success-striped",  # Estilo com efeito visual
    maximum=100
)
progress_bar.pack(pady=10)

# Iniciar a atualização
update_disk_usage()

# Executar a interface
root.mainloop()