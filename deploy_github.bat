@echo off
chcp 65001 >nul
echo ===================================================
echo     DEPLOIEMENT LUMIOS PLAY SUR GITHUB
echo ===================================================

:: ─── Vérification sécurité : .env ne doit pas être pushé ────────────────────
echo.
echo [SECURITE] Verification que .env est dans .gitignore...
findstr /c:".env" .gitignore >nul 2>&1
if errorlevel 1 (
    echo ERREUR : .env n'est pas dans .gitignore !
    echo Ajoutez-le avant de deployer pour proteger vos secrets.
    pause
    exit /b 1
)
echo OK - .env est protege.

:: ─── 1. Push code source vers le depot PRIVE ────────────────────────────────
echo.
echo [1/3] Push du code source vers le depot PRIVE...
echo ---------------------------------------------------
git remote get-url private >nul 2>&1
if errorlevel 1 (
    git remote add private https://github.com/lumios-le-jeu/Lumios_play_private.git
)
git add .
git commit -m "Deploy: %DATE% %TIME%"
git branch -M main
git push private main --force
echo Push prive OK !

:: ─── 2. Build de la version publique ────────────────────────────────────────
echo.
echo [2/3] Build de la version publique...
echo ---------------------------------------------------
call npm run build
if errorlevel 1 (
    echo ERREUR : Le build a echoue ! Corrigez les erreurs avant de deployer.
    pause
    exit /b 1
)
echo Build OK !

:: ─── 3. Push build statique vers le depot PUBLIC ────────────────────────────
echo.
echo [3/3] Push du build vers le depot PUBLIC...
echo ---------------------------------------------------
cd public\client
git init
git add .
git commit -m "Deploy static build: %DATE% %TIME%"
git remote get-url public >nul 2>&1
if errorlevel 1 (
    git remote add public https://github.com/lumios-le-jeu/Lumios_play.git
)
git branch -M main
git push public main --force
cd ..\..
echo Push public OK !

echo.
echo ===================================================
echo DEPLOIEMENT TERMINE AVEC SUCCES !
echo ===================================================
pause
