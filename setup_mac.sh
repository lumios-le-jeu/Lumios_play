#!/bin/bash

# ─── Lumios Play — Script de Setup pour Mac Mini ─────────────────────────────
# Ce script prépare l'environnement, compile le client et lance le serveur PM2.

echo "🚀 Démarrage du setup Lumios Play..."

# 1. Installation des dépendances
echo "📦 Installation des dépendances npm..."
npm install

# 2. Nettoyage et création des dossiers clients
echo "🧹 Nettoyage des anciens builds..."
rm -rf dist
mkdir -p public/client

# 3. Build du frontend Vite
echo "⚙️  Compilation du frontend (Vite)..."
npm run build

# 4. Déplacement des fichiers vers le dossier 'public/client'
# Le serveur Node (server.cjs) sert les fichiers depuis ce dossier.
echo "📂 Préparation du dossier de service statique..."
cp -r dist/* public/client/

# 5. Lancement / Redémarrage via PM2
echo "🔄 Lancement du serveur avec PM2..."
# On vérifie si lumios-play existe déjà
if pm2 list | grep -q "lumios-play"; then
  pm2 reload lumios-play
else
  pm2 start server.cjs --name "lumios-play"
fi

# 6. Sauvegarde de la configuration PM2 (pour reboot)
pm2 save

echo ""
echo "✅ Setup terminé avec succès !"
echo "🌐 Le serveur écoute sur le port 3001."
echo "🔗 Pensez à vérifier votre fichier .env avec vos clés Supabase."
echo "📋 Utilisez 'pm2 logs lumios-play' pour voir les logs en temps réel."
echo ""
