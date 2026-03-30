@echo off
title LUMIOS PLAY — SERVEUR + TUNNEL
color 0B

echo.
echo  =====================================================
echo       LUMIOS PLAY — DEMARRAGE DU SERVEUR
echo  =====================================================
echo.

:: 1. Build frontend (si necessaire)
echo  [1/3] Verification du build frontend...
if not exist "public\client\index.html" (
    echo  Build manquant, build en cours...
    call npm run build
    echo  Build OK !
) else (
    echo  Build deja present.
)

echo.
echo  [2/3] Demarrage du serveur Node.js (port 3000)...
start "Lumios Play - Serveur" /B node server.cjs
timeout /t 2 /nobreak > nul
echo  Serveur demarre en tache de fond.

echo.
echo  [3/3] Demarrage du Tunnel Cloudflare...
echo  Remplacez le token ci-dessous par le votre (voir CLOUDFLARE_GUIDE.md)
echo.

:: Token Cloudflare — A REMPLACER par votre token
set CLOUDFLARE_TOKEN=VOTRE_TOKEN_CLOUDFLARE_ICI

:: Chemin vers cloudflared (winget)
set CLOUDFLARED=cloudflared
if exist "C:\Users\%USERNAME%\AppData\Local\Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe" (
    set CLOUDFLARED="C:\Users\%USERNAME%\AppData\Local\Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe"
)

echo  Demarrage du tunnel...
%CLOUDFLARED% tunnel run --token %CLOUDFLARE_TOKEN%

echo.
echo  SI TU VOIS CA, LE TUNNEL A CRASHE.
pause
