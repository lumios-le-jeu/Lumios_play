# Lumios Play — Correction de tous les bugs signalés

## Résumé des problèmes

12 bugs répartis sur 3 modes (Invité, Individuel, Famille).

---

## Proposed Changes

### A — MODE INVITÉ

#### [MODIFY] PlayScreen.tsx — A1 : Masquer les boutons selon le type de compte
- **Guest** → voir uniquement "Défi entre Amis"
- **Individual** → voir "Défi entre Amis", "Compétition", "Rejoindre un tournoi" (PAS Défi Famille)
- **Family** → voir tous les modes

#### [MODIFY] App.tsx — A2 : Persistance session invité au F5
- Dans `restoreSession`, avant de retourner si pas de session Supabase, vérifier `sessionStorage.getItem('lumios_guest')` et restaurer le profil invité avec les stats accumulées (rankTier, rankStep, seasonXp, winStreak depuis le JSON étendu)

#### [MODIFY] App.tsx + FriendDuelModal.tsx — A3 : Import XP lors de la création de compte
- S'assurer que `refreshCurrentProfile(updates)` en mode invité met bien à jour `currentProfile` avec les stats de match
- Corriger le calcul erroné de `seasonXpP1New/P2New` dans `handleSubmitResult` (utilise `opponent.elo` au lieu de l'XP réel)

---

### B — MODE COMPTE INDIVIDUEL

#### [MODIFY] FriendDuelModal.tsx — B1 : Supprimer étape commentaires + galerie photos
- Supprimer l'état `'comments'` du workflow : sauter directement de `score-entry` → `handleSubmitResult` → `result`
- Retirer le champ `commentWinner`/`commentLoser` de l'UI (garder la prise de photo uniquement)
- La galerie photos sera visible dans l'historique des matchs (DashboardScreen)

#### [MODIFY] api.ts — B2/B3/C3 : Nouvelles fonctions API
- Ajouter `getSuggestedFriends(profileId)` : retourne les joueurs adversaires passés qui ne sont pas encore amis
- Ajouter `getSentPendingRequests(profileId)` : retourne les demandes d'amis envoyées en attente

#### [MODIFY] FriendsScreen.tsx — B3/C3 : Propositions d'amis + demandes envoyées
- Ajouter section **"Propositions d'amis"** avec les profils des joueurs déjà affrontés
- Ajouter section **"Demandes envoyées"** (en attente d'acceptation)

#### [MODIFY] FriendsScreen.tsx — B5/C2 : Supprimer filtre "En ligne" et statuts
- Retirer les boutons de filtre "Tous / 🟢 En ligne"
- Retirer les icônes Wifi/WifiOff et labels "En ligne/Hors ligne" des cartes amis

#### [MODIFY] AuthScreen.tsx + api.ts — B4 : Fix recherche famille
- Pour les comptes FAMILLE, stocker le `familyName` dans le champ `name` de `parent_accounts` (au lieu du nom du responsable)
- Cela permet à `searchFamilyAccounts` qui cherche par `name` de trouver correctement "Les Dupont"

#### [MODIFY] ProfileScreen.tsx — B4 : Scanner QR famille (compte individuel)
- Ajouter un bouton "Scanner le QR d'une famille" dans le modal de liaison famille
- Ce bouton ouvre la caméra pour scanner le QR code de la famille

#### [NEW] patch_leaderboard_view.sql — B2/C4 : Fix leaderboard_view
- Recréer la vue `leaderboard_view` avec un comptage correct des matchs via un `COUNT` direct depuis la table `matches`
- La vue doit aussi calculer le `tier_weight` correctement

---

### C — MODE COMPTE FAMILLE

#### [MODIFY] ProfileScreen.tsx — C1 : Nom de famille + QR code famille
- Afficher le nom de la famille (`parentAccount?.name`) bien visible dans le profil famille
- Ajouter un QR code famille (contenant `parentId`) directement accessible (pas caché)
- Payload QR famille : `{ type: 'join-family', parentId, familyName }`

#### B5/C2 — Voir FriendsScreen.tsx ci-dessus

#### B3/C3 — Voir FriendsScreen.tsx ci-dessus

#### C4 — Voir patch_leaderboard_view.sql ci-dessus

---

## Verification Plan

### Tests automatiques
- `npm run dev` → vérifier build sans erreur TypeScript

### Tests manuels
- [ ] Mode invité : seul "Défi entre Amis" visible dans Play
- [ ] F5 en mode invité : session restaurée correctement
- [ ] Création de compte après match invité : XP transféré
- [ ] Compte individuel : "Défi Famille" absent, compétition présente
- [ ] Amis : pas de filtre En ligne, pas de statut connecté
- [ ] Amis : section "Propositions d'amis" visible
- [ ] Amis : section "Demandes envoyées" visible
- [ ] Profil famille : nom famille affiché, QR famille accessible
- [ ] Compte individuel : scanner QR famille fonctionne
- [ ] Leaderboard : match count correct, classement cohérent
