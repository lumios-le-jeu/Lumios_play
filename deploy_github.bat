@echo off
echo ===================================================
echo     DEPLOIEMENT LUMIOS PLAY SUR GITHUB
echo ===================================================

echo.
echo 1. Push du code source au complet vers le depot PRIVE
echo ---------------------------------------------------
git remote add private https://github.com/lumios-le-jeu/Lumios_play_private.git
git branch -M main
git push -u private main --force

echo.
echo 2. Generation du Build Public...
echo ---------------------------------------------------
call npm run build

echo.
echo 3. Push de la version publique vers le depot PUBLIC
echo ---------------------------------------------------
cd dist
git init
git add .
git commit -m "Deploy public static build"
git remote add public https://github.com/lumios-le-jeu/Lumios_play.git
git branch -M main
git push -u public main --force
cd ..

echo.
echo ===================================================
echo DEPLOIEMENT TERMINE !
echo ===================================================
pause
