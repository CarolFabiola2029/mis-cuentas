@echo off
cd /d "%~dp0"
echo.
echo  Mis Cuentas - servidor de prueba
echo  --------------------------------
echo  En esta laptop abre:   http://localhost:8000
echo.
echo  En el iPhone (misma wifi) abre en Safari:  http://IP-DE-LA-LAPTOP:8000
echo  La IP es la que dice "Direccion IPv4" en esta lista:
ipconfig | findstr /i "IPv4"
echo.
echo  Para apagarlo, cierra esta ventana.
echo.
python -m http.server 8000 --bind 0.0.0.0
pause
