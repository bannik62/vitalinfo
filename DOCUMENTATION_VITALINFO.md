## Vue d’ensemble

**Vitalinfo** est une application web composée d’un **backend Node.js/Express** et d’un **frontend Svelte + Vite**.  
Elle gère des données sensibles avec un focus fort sur la **sécurité**, les **logs** et la **surveillance**.

- **Backend** : API REST sécurisée (Express, Sequelize, MySQL).
- **Frontend** : application SPA Svelte (Vite) qui consomme l’API.
- **Sécurité & monitoring** : journaux de sécurité, alertes, scripts de migration et de configuration détaillés dans les autres guides.

---

## Architecture du projet

- **backend**  
  - API HTTP (Express 5).  
  - Authentification (JWT, bcrypt).  
  - Accès base de données via **Sequelize** (`mysql2`).  
  - Gestion des fichiers (via `multer` si nécessaire).  
  - Middleware de sécurité (CSRF via `csurf`, `cors`, `cookie-parser`, etc.).

- **frontend**  
  - Application **Svelte** (Vite).  
  - Appels HTTP vers l’API via **axios**.  
  - Gestion de l’état au niveau composant/stores Svelte.

- **Docs spécifiques**  
  - `MIGRATION_INSTRUCTIONS.md` : instructions pour exécuter les migrations et mettre à jour le schéma.  
  - `GUIDE_MONITORING.md` : configuration et utilisation du système de logs/monitoring de sécurité.  
  - `analyse_protection_formulaires.md` : analyse des protections des formulaires (CSRF, validations, etc.).

---

## Backend

**Technos principales**

- Node.js (modules ES, `"type": "module"`)
- Express 5 (`express`)
- Sequelize + MySQL (`sequelize`, `mysql2`)
- Auth & sécurité : `bcrypt`, `jsonwebtoken`, `csurf`, `cookie-parser`, `cors`, `dotenv`

**Scripts npm (backend)**

- `npm run lint` : analyse du code avec ESLint.

**Points clés de sécurité**

- **Hash des mots de passe** avec `bcrypt`.  
- **JWT** pour la gestion des sessions côté API.  
- **CSRF** via `csurf` pour les formulaires et requêtes sensibles.  
- **CORS** configuré pour limiter les origines autorisées.  
- **Logs de sécurité et alertes** : voir `backend/models/SecurityLog.mjs`, `backend/utils/securityLogger.js`, `backend/utils/securityAlerts.js` et `GUIDE_MONITORING.md`.

---

## Frontend

**Technos principales**

- Svelte 5
- Vite 7
- axios pour les appels API

**Scripts npm (frontend)**

- `npm run dev` : lance le serveur de dev Vite.  
- `npm run build` : build de production.  
- `npm run preview` : prévisualisation du build.  
- `npm run lint` : ESLint sur le code front.

Le frontend consomme l’API du backend via `axios` (les URLs et endpoints sont à vérifier selon l’environnement : dev/prod).

---

## Installation & démarrage

### Prérequis

- Node.js (version LTS recommandée)  
- Base de données **MySQL** accessible (local ou distante)  
- Fichier `.env` pour le backend correctement configuré (variables DB, JWT secret, etc.)

### 1. Cloner le dépôt

```bash
git clone <URL_DU_REPO> vitalinfo
cd vitalinfo
```

### 2. Installer les dépendances

**Backend**

```bash
cd backend
npm install
```

**Frontend**

```bash
cd ../frontend
npm install
```

---

## Configuration

### Backend – variables d’environnement

Créer un fichier `.env` dans `backend` (ou adapter à votre système actuel) avec au minimum :

```bash
DB_HOST=...
DB_PORT=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
JWT_SECRET=...
NODE_ENV=development
```

Adapter en fonction de votre infra (prod/staging/dev).  
Consultez `MIGRATION_INSTRUCTIONS.md` pour la configuration base + migrations.

### Frontend – configuration API

Selon votre setup, vous pouvez définir une variable d’environnement Vite (par ex. `VITE_API_BASE_URL`) pour pointer vers l’API du backend :

```bash
VITE_API_BASE_URL=http://localhost:3000
```

et l’utiliser dans le code via `import.meta.env.VITE_API_BASE_URL`.

---

## Lancer le projet en développement

### Backend

```bash
cd backend
npm run dev        # si un script dev est défini, sinon npm start / node index.js
```

Adapter la commande au script réellement défini dans `backend/package.json`.

### Frontend

```bash
cd frontend
npm run dev
```

Par défaut, l’application sera disponible sur `http://localhost:5173` (ou autre port Vite).

---

## Migrations & base de données

Le backend utilise **Sequelize** et probablement **sequelize-cli** pour gérer les migrations.  
Référez‑vous à :

- `MIGRATION_INSTRUCTIONS.md`  
- `backend/run-migration.sh`

pour :

- Initialiser la base de données.  
- Exécuter les migrations.  
- Mettre à jour le schéma lors des nouvelles versions.

---

## Monitoring & logs de sécurité

Le projet inclut un système de **journalisation des événements de sécurité** (IP, actions sensibles, erreurs auth, etc.) et d’**alertes** en cas de comportements suspects.

Pour les détails :

- Lire `GUIDE_MONITORING.md`.  
- Parcourir les fichiers :
  - `backend/models/SecurityLog.mjs`  
  - `backend/routes/security.js`  
  - `backend/utils/securityLogger.js`  
  - `backend/utils/securityAlerts.js`

---

## Intégration n8n (workflows & agent IA)

Vitalinfo s’appuie fortement sur **n8n** pour l’**automatisation des workflows**, le **traitement des documents** et l’**agent IA**.

- **Envoi de documents vers n8n**  
  - Route backend : `POST /agent/docs/upload` (`backend/routes/agent.js`).  
  - Sécurisée par `authenticateToken` (JWT) + `csrfProtection` + upload `multer` (PDF uniquement).  
  - Le fichier PDF est envoyé à n8n via `N8N_UPLOAD_URL` (Form Trigger) avec :
    - `doc` (fichier PDF, buffer mémoire)
    - `userId`, `userEmail`
    - métadonnées de nom de fichier (`fileName`, `originalName`, `original_filename`).
  - n8n traite le document (extraction, agent IA, stockage Supabase, etc.) puis renvoie les résultats via un webhook de retour.

- **Chat avec l’agent IA (n8n)**  
  - Route backend : `POST /agent/chat`.  
  - Appelle `N8N_CHAT_URL` avec le message et les infos utilisateur.  
  - La réponse de n8n (`answer` ou `output`) est renvoyée au frontend et **sauvegardée** dans `ChatConversation`.

- **Webhook de résultats n8n → backend**  
  - Route : `POST /agent/docs/result`.  
  - Sécurisée par un header `x-n8n-secret` vérifié dans `assertN8NSecret`.  
  - Le backend stocke temporairement les résultats/erreurs par `userId` pour les afficher dans l’UI.

- **Configuration n8n côté backend (.env)**  
  Ajouter/adapter dans `backend/.env` :

  ```bash
  N8N_UPLOAD_URL=https://n8n.codeurbase.fr/webhook/agent/upload   # ou votre URL
  N8N_CHAT_URL=https://n8n.codeurbase.fr/webhook/chat             # ou votre URL
  N8N_WEBHOOK_SECRET=...                                          # secret partagé avec n8n
  MAX_UPLOAD_SIZE=20971520                                        # optionnel, taille max fichier (en octets)
  ```

  - `N8N_WEBHOOK_SECRET` doit être **strictement identique** à celui configuré dans le workflow n8n (header `x-n8n-secret`).  
  - En dev, vous pouvez utiliser un n8n distant ou un tunnel (ngrok, Cloudflare Tunnel…) pour exposer votre n8n local.

Sur le frontend, le module `Board` (par ex. `frontend/src/modules/module_board/Board.svelte`) gère :

- L’upload du document vers `/agent/docs/upload`.  
- L’affichage de l’état de la transmission (**“Envoyer vers n8n”**, “Document transmis…”).  
- Le panneau “**Retour n8n**” qui consomme les résultats/erreurs renvoyés par le webhook backend.

---

## Qualité du code

Les deux parties (backend et frontend) utilisent **ESLint** avec une configuration moderne :

- `eslint`  
- `eslint-config-prettier`  
- `eslint-plugin-import`  
- (frontend) `eslint-plugin-svelte`

Pour lancer l’analyse :

```bash
cd backend
npm run lint

cd ../frontend
npm run lint
```

---

## Pistes d’amélioration possibles

- Compléter cette documentation avec :
  - Les endpoints de l’API (routes, paramètres, payloads).  
  - Les rôles/utilisateurs et règles de permissions.  
  - Le workflow de déploiement (CI/CD, env prod).  
  - Des exemples de requêtes (curl, Postman, etc.).

Cette page sert de **vue d’ensemble** et de **point d’entrée** pour comprendre Vitalinfo.

