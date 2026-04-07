@echo off
title LUMIOS PLAY — SETUP SUPABASE CLI
color 0B
chcp 65001 >nul

echo.
echo  =====================================================
echo       LUMIOS PLAY — SETUP SUPABASE
echo  =====================================================
echo.

:: 1. Initialisation (deja fait mais au cas ou)
echo  [1/3] Initialisation du projet...
if not exist "supabase\config.toml" (
    call npx supabase init
) else (
    echo  Projet deja initialise.
)

:: 2. Connexion / Login
echo.
echo  [2/3] Authentification Supabase...
echo  (Une fenetre de navigateur va s'ouvrir)
call npx supabase login

:: 3. Linking
echo.
echo  [3/3] Liaison avec le projet distant...
echo  ID : ooyzbcwtcilbloznmlpt
echo  On va vous demander le mot de passe de la base de donnees.
echo.
call npx supabase link --project-ref ooyzbcwtcilbloznmlpt

echo.
echo  =====================================================
echo  SETUP TERMINE ! Vous pouvez maintenant deployer (migrations).
echo  =====================================================
pause
