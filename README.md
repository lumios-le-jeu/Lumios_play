# Lumios Play

Lumios Play est une application web social-sportive conçue pour accompagner le jeu de boules lumineuses "Lumios". 
Elle incorpore un système de gestion de profil complet (parent/enfant pour respecter la confidentialité des plus jeunes), de géolocalisation pour trouver des amis ou des arènes, des tournois ELO, et des défis via génération de QR codes (comme le pattern *QRGAME*).

## Fonctionnalités
- ✨ Authentification 5 étapes (flux Parent > Enfant)
- 🎮 Hub principal de jeu (Défis, Arènes, Match Libre, Tournois ELO/Coupes)
- 📡 Temps réel (via Socket.io & backend Node) 
- 📍 Géolocalisation via algorithme Haversine
- 🌟 Glassmorphism & Framer Motion (animations natives mobile-first)
- 🏆 Podium interactif & Classement
- 🏅 Système complet de progression ELO et Badges

## Architecture

**Frontend** : Vite, React 18, TypeScript, TailwindCSS v3, Framer Motion, Lucide React, Socket.IO Client.  
**Backend** : Node.js (Express), Socket.IO (Temps Réel)   
**Base de données (Optionnelle pour la démo PWA, mais configurée)** : Supabase API v2.  

## Lancement (Développement)

Pour une utilisation complète avec le backend localement exposé via Cloudflare Tunnels (comme dans le tutoriel QRGAME) :

```bash
# 1. Installez les dépendances
npm install

# 2. Modifiez votre token Cloudflare dans LANCER_LUMIOS.bat

# 3. Lancez le script global qui compile le client, démarre le serveur Node et lie le tunnel
LANCER_LUMIOS.bat
```

> [!NOTE]
> Vous pouvez aussi lancer en démo locale simple : `npm run build` puis `node server.cjs`. Le serveur sera dispo sur `http://localhost:3000`. Vous pouvez aussi tester en mode hot-reload *Vite* avec `npm run dev` (mais sans les weckets de `node server.cjs` fonctionnels si celui-ci n'est pas démarré en parallèle).

## Fichiers de configuration

- `.env.example` : Assurez-vous d'avoir bien copié le template (par ex: `cp .env.example .env`) et repli vos credentials Supabase.
- `supabase/migrations/202603300000_init.sql` : Contient le schéma initial de la base de données PostgreSQL. 

---

### Auteur / Conception
*Félicitations pour Vibe Coding.* — Mars 2026.
