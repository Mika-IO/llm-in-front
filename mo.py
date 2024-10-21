import ctypes
import time

# Definindo a estrutura POINT
class POINT(ctypes.Structure):
    _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]

# Função para mover o mouse
def move_mouse(x, y):
    ctypes.windll.user32.SetCursorPos(x, y)

# Espera 2 segundos antes de mover o mouse
time.sleep(2)

# Altere as coordenadas x e y para a posição desejada
x = 500  # Coordenada x
y = 300  # Coordenada y

# Move o mouse para a posição especificada
move_mouse(x, y)
