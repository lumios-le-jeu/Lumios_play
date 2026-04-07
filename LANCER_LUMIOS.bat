@echo off
title LUMIOS PLAY - SERVEUR ET TUNNEL
color 0B

echo.
echo  =====================================================
echo       LUMIOS PLAY - DEMARRAGE DU SERVEUR
echo  =====================================================
echo.

:: 1. Charger les variables d'environnement depuis le .env
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        set "%%A=%%B"
    )
) else (
    echo [ERREUR] Fichier .env manquant !
    pause
    exit
)

:: 2. Chemin vers cloudflared
set CLOUDFLARED=cloudflared
if exist "C:\Users\%USERNAME%\AppData\Local\Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe" (
    set CLOUDFLARED="C:\Users\%USERNAME%\AppData\Local\Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe"
)

:: 3. Nettoyage et Build frontend (FORCÉ pour être sûr)
echo [1/3] Nettoyage et construction du frontend...
if exist "public\client" rd /s /q "public\client"
call npm run build

:: 4. Demarrage du serveur Node.js sur le port 3001
echo.
echo [2/3] Demarrage du serveur Node.js...
start "Lumios - Serveur" cmd /k "title LUMIOS-SERVER && node server.cjs"
timeout /t 2 /nobreak >nul

:: 5. Lancement du tunnel Cloudflare
echo [3/3] Connexion au tunnel...
echo.
"%CLOUDFLARED%" tunnel run --token %CLOUDFLARE_TOKEN%

echo.
echo ============================================================
echo ATTENTION : Le tunnel s'est arrete !
echo ============================================================
pause
