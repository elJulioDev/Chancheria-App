#!/bin/bash
echo "Instalando dependencias..."
pip3 install -r requirements.txt --break-system-packages

echo "Recolectando archivos estáticos..."
python3 manage.py collectstatic --noinput

echo "Aplicando migraciones..."
python3 manage.py migrate