# Analyse du Mode de Protection des Formulaires - VitalInfo
## Du Frontend au Backend

---

## 📋 Vue d'ensemble

Le projet VitalInfo implémente un **système de protection multicouches** pour sécuriser les formulaires et les interactions utilisateur du frontend au backend. Cette architecture garantit la protection contre les principales menaces web (CSRF, brute force, injection, etc.).

---

## 🛡️ Architecture de Sécurité

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Svelte)                         │
├─────────────────────────────────────────────────────────────────┤
│  1. Validation côté client (format, longueur)                   │
│  2. Récupération du token CSRF (Securecsrf.svelte)              │
│  3. Envoi avec headers sécurisés (withCredentials + X-CSRF-Token)│
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REVERSE PROXY (Apache)                        │
├─────────────────────────────────────────────────────────────────┤
│  - SSL/TLS Termination (ports 80/443)                           │
│  - Virtual Host Management                                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express/Node.js)                     │
├─────────────────────────────────────────────────────────────────┤
│  MIDDLEWARES (ordre d'exécution) :                              │
│  1. CORS (origin validation)                                    │
│  2. Cookie Parser                                               │
│  3. Rate Limiting (loginRateLimit)                              │
│  4. CSRF Protection (csrfProtection)                            │
│  5. JWT Authentication (authenticateToken)                      │
│  6. Input Validation & Sanitization                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Couches de Protection Frontend

### 1. **Module de Sécurité CSRF** (`Securecsrf.svelte`)

**Emplacement** : `/frontend/src/modules/security/module_csrf/Securecsrf.svelte`

**Fonctionnement** :
```javascript
// 1. Récupération automatique au montage du composant
onMount(() => {
  getCsrfToken();
});

// 2. Appel API pour obtenir le token
async function getCsrfToken() {
  const response = await axios.get('/api/auth/csrf-token', {
    withCredentials: true  // ← Envoie les cookies (CSRF cookie)
  });
  csrfToken = response.data?.csrfToken;
}

// 3. Dispatch du token au composant parent
dispatch('csrfTokenReceived', csrfToken);
```

**Caractéristiques** :
- Composant invisible (display: none)
- Récupération silencieuse du token
- Gestion d'erreur discrète
- Événement custom pour transmettre le token

---

### 2. **Validation côté client** (`FormLogin.svelte`)

**Emplacement** : `/frontend/src/modules/module_login/FormLogin.svelte`

**Validations implémentées** :

```javascript
// 1. Vérification des champs vides
if (!trimmedEmail || !trimmedPassword) {
  return error("Veuillez remplir tous les champs");
}

// 2. Validation du format email (regex)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(trimmedEmail)) {
  return error("Format d'email invalide");
}

// 3. Limites de longueur
if (trimmedEmail.length > 255) {
  return error("Email trop long");
}
if (trimmedPassword.length > 128) {
  return error("Mot de passe trop long");
}

// 4. Vérification du token CSRF
if (!csrfToken) {
  return error("Token CSRF non disponible");
}
```

**Avantages** :
- Feedback immédiat à l'utilisateur
- Réduction de la charge serveur
- Prévention des soumissions invalides

---

### 3. **Envoi sécurisé des requêtes**

**Configuration Axios** :

```javascript
const response = await axios.post(
  "/api/auth/login",
  {
    email: trimmedEmail.toLowerCase(),  // ← Normalisation
    password: trimmedPassword,
  },
  {
    headers: {
      "X-CSRF-Token": csrfToken,       // ← Token CSRF dans header
    },
    withCredentials: true,              // ← Envoi des cookies (JWT)
  }
);
```

**Points clés** :
- `withCredentials: true` : Permet l'envoi et la réception de cookies HTTP-only
- `X-CSRF-Token` : Header custom pour la validation CSRF côté serveur
- Normalisation des données (toLowerCase, trim)

---

## 🔒 Couches de Protection Backend

### 1. **Configuration CORS** (`index.js`)

**Emplacement** : `/backend/index.js`

```javascript
const allowedOrigins = [
  'http://localhost:5173',           // Dev local
  'https://vitalinfo.site',          // Production
  'https://www.vitalinfo.site'       // Production (www)
];

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans Origin (curl, healthcheck)
    if (!origin) return callback(null, true);
    
    // Vérifier si l'origine est autorisée
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Rejeter les autres origines
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true  // ← Autoriser les cookies cross-origin
}));
```

**Protection** : Empêche les requêtes depuis des domaines non autorisés.

---

### 2. **Protection CSRF** (`middleware/csrf.js`)

**Emplacement** : `/backend/middleware/csrf.js`

**Mécanisme Double Submit Cookie** :

```javascript
import csrf from 'csurf';

// Middleware de protection CSRF (vérifie le token)
const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,      // ← Cookie non accessible via JavaScript
    secure: false,       // ← À mettre en true en production HTTPS
    sameSite: 'strict'   // ← Protection contre CSRF cross-site
  }
});

// Middleware de génération (sans vérification pour GET)
const csrfTokenGenerator = csrf({ 
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'strict'
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS']  // ← Pas de vérification GET
});
```

**Routes protégées** :
- ✅ `POST /api/auth/login` (avec csrfProtection)
- ✅ `POST /api/docs/upload` (avec csrfProtection)
- ✅ `POST /api/agent/chat` (avec csrfProtection)
- ✅ `PUT /api/docs/:id` (avec csrfProtection)
- ✅ `DELETE /api/agent/chat/:id` (avec csrfProtection)

**Flux CSRF** :
```
1. GET /api/auth/csrf-token (csrfTokenGenerator)
   → Le serveur génère un token et un cookie _csrf
   → Renvoie le token dans la réponse JSON

2. POST /api/auth/login (csrfProtection)
   → Le client envoie le token dans le header X-CSRF-Token
   → Le serveur compare le token avec le cookie _csrf
   → Si match : requête acceptée
   → Si no match : 403 Forbidden
```

---

### 3. **Rate Limiting** (`middleware/rateLimit.js`)

**Emplacement** : `/backend/middleware/rateLimit.js`

**Protection contre le brute force** :

```javascript
// Configuration
const MAX_ATTEMPTS = 5;                    // 5 tentatives max
const WINDOW_MS = 15 * 60 * 1000;          // Fenêtre de 15 minutes
const BLOCK_DURATION_MS = 15 * 60 * 1000;  // Blocage de 15 minutes

// Stockage en mémoire par IP
const loginAttempts = new Map();
// Structure: { count, firstAttempt, lastAttempt, blocked, blockedUntil }
```

**Fonctionnement** :

```javascript
// 1. Middleware loginRateLimit (avant la route)
router.post('/login', csrfProtection, loginRateLimit, async (req, res) => {
  // Si IP bloquée : retourne 429 Too Many Requests
  // Si pas bloquée : continue vers la route
});

// 2. En cas d'échec de connexion
incrementLoginAttempts(req);  // Incrémente le compteur

// 3. En cas de succès de connexion
resetLoginAttempts(req);      // Réinitialise le compteur
```

**Retour d'informations au client** :

```javascript
// En cas de dépassement
{
  error: "Trop de tentatives de connexion...",
  retryAfter: 900,  // secondes
  attemptsInfo: {
    attempts: 5,
    remaining: 0,
    blocked: true,
    blockedUntil: 1734745200000,
    remainingMinutes: 15
  }
}
```

**Protection** :
- Limite les tentatives de login par IP
- Blocage temporaire après 5 échecs
- Détection de l'IP réelle (trust proxy)

---

### 4. **Authentification JWT** (`middleware/auth.js`)

**Emplacement** : `/backend/middleware/auth.js`

**Vérification du token JWT** :

```javascript
export const authenticateToken = (req, res, next) => {
  // 1. Extraire le token du cookie HTTP-only
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    // 2. Vérifier la signature JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 3. Injecter les données utilisateur dans req
    req.user = decoded;  // { id, email, role }
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide' });
  }
};
```

**Génération du token** (`routes/auth.js`) :

```javascript
// Après validation du login
const token = jwt.sign(
  { 
    id: user.id, 
    email: user.email,
    role: user.role 
  },
  JWT_SECRET,
  { expiresIn: '1h' }  // ← Expiration automatique
);

// Cookie HTTP-only (non accessible en JavaScript)
res.cookie('token', token, {
  httpOnly: true,       // ← Protection XSS
  secure: false,        // ← À mettre en true en HTTPS
  sameSite: 'strict',   // ← Protection CSRF
  maxAge: 60 * 60 * 1000  // 1 heure
});
```

**Routes protégées par JWT** :
- `POST /api/board/`
- `POST /api/docs/upload`
- `POST /api/agent/chat`
- `GET /api/agent/chat/history`
- `DELETE /api/agent/chat/:id`
- `GET /api/docs/latest`
- `PUT /api/docs/:id`

---

### 5. **Validation et Sanitization** (`routes/auth.js`)

**Emplacement** : `/backend/routes/auth.js`

**Fonction de validation** :

```javascript
function validateAndSanitizeLogin(email, password) {
  // 1. SANITIZATION : Nettoyage des données
  const sanitizedEmail = typeof email === 'string' 
    ? email.trim().toLowerCase()  // trim + normalisation
    : '';
  const sanitizedPassword = typeof password === 'string' 
    ? password.trim() 
    : '';

  // 2. VALIDATION : Champs requis
  if (!sanitizedEmail || !sanitizedPassword) {
    return { valid: false, error: 'Email et mot de passe requis' };
  }

  // 3. VALIDATION : Longueur maximale (protection buffer overflow)
  if (sanitizedEmail.length > 255) {
    return { valid: false, error: 'Email trop long' };
  }
  if (sanitizedPassword.length > 128) {
    return { valid: false, error: 'Mot de passe trop long' };
  }

  // 4. VALIDATION : Format email (regex)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitizedEmail)) {
    return { valid: false, error: 'Format d\'email invalide' };
  }

  return { 
    valid: true, 
    email: sanitizedEmail, 
    password: sanitizedPassword 
  };
}
```

**Application dans la route** :

```javascript
router.post('/login', csrfProtection, loginRateLimit, async (req, res) => {
  const { email, password } = req.body;

  // Validation + sanitization
  const validation = validateAndSanitizeLogin(email, password);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  // Utilisation des données nettoyées
  const user = await User.findOne({ 
    where: { email: validation.email }  // ← Email sanitizé
  });

  // Vérification du mot de passe hashé
  const isValid = await bcrypt.compare(
    validation.password,  // ← Password sanitizé
    user.password
  );
});
```

---

### 6. **Protection Upload de Fichiers** (`routes/agent.js`)

**Configuration Multer** :

```javascript
const upload = multer({
  storage: multer.memoryStorage(),  // ← En mémoire (pas de fichier temporaire)
  limits: {
    fileSize: 20 * 1024 * 1024      // ← Limite 20 MB
  }
});
```

**Validations upload** :

```javascript
router.post('/docs/upload',
  authenticateToken,     // ← Vérif JWT
  csrfProtection,        // ← Vérif CSRF
  handleUpload,          // ← Gestion upload
  async (req, res) => {
    
    // 1. Vérifier présence du fichier
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu.' });
    }

    // 2. Vérifier le type MIME
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ 
        error: 'Seuls les fichiers PDF sont autorisés.' 
      });
    }

    // 3. Vérifier le nom du fichier
    if (!req.file.originalname) {
      return res.status(400).json({ 
        error: 'Nom de fichier manquant.' 
      });
    }
    
    // 4. Transmission sécurisée à n8n
    const formData = new FormData();
    formData.append('doc', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    formData.append('userId', req.user?.id || 'global');
    
    // Envoi à n8n avec timeout
    await axios.post(N8N_UPLOAD_URL, formData, {
      timeout: 30_000
    });
  }
);
```

---

### 7. **Protection Webhooks n8n** (`routes/agent.js`)

**Vérification du secret partagé** :

```javascript
const assertN8NSecret = (req, res, next) => {
  // 1. Vérifier que le secret est configuré
  if (!N8N_WEBHOOK_SECRET) {
    return res.status(500).json({ 
      error: 'Le secret N8N_WEBHOOK_SECRET est manquant.' 
    });
  }
  
  // 2. Extraire le secret du header
  const headerSecret = req.headers['x-n8n-secret'];
  
  // 3. Comparer avec le secret attendu
  if (!headerSecret || headerSecret !== N8N_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Accès non autorisé.' });
  }
  
  next();
};

// Application sur les routes de callback n8n
router.post('/docs/result', assertN8NSecret, (req, res) => {
  // Seules les requêtes avec le bon secret peuvent accéder
});

router.post('/errors', assertN8NSecret, (req, res) => {
  // Protection contre les faux webhooks
});
```

**Protection** : Empêche des acteurs malveillants d'injecter de fausses données via les webhooks.

---

## 📊 Tableau Récapitulatif des Protections

| Protection | Frontend | Backend | Objectif |
|-----------|----------|---------|----------|
| **CSRF Token** | ✅ Récupération + Envoi | ✅ Génération + Validation | Prévenir les attaques CSRF |
| **Validation Input** | ✅ Format, longueur | ✅ Sanitization, regex | Prévenir injection SQL/XSS |
| **Rate Limiting** | ❌ | ✅ Par IP (5/15min) | Prévenir brute force |
| **JWT Authentication** | ✅ Envoi cookie | ✅ Vérification signature | Authentification stateless |
| **CORS** | ✅ withCredentials | ✅ Origin whitelist | Isoler les domaines autorisés |
| **Cookie Security** | ❌ | ✅ httpOnly, sameSite | Protection XSS/CSRF |
| **HTTPS** | ✅ | ✅ (via Apache) | Chiffrement transport |
| **File Upload** | ✅ Type validation | ✅ MIME check, size limit | Prévenir upload malveillant |
| **Webhook Secret** | ❌ | ✅ Header verification | Authentifier n8n |

---

## 🔄 Flux Complet de Connexion (Login)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. INITIALISATION                                                │
├─────────────────────────────────────────────────────────────────┤
│ Frontend (FormLogin.svelte) :                                    │
│   - Mount du composant Securecsrf.svelte                        │
│   - GET /api/auth/csrf-token                                     │
│   → Backend génère token CSRF + cookie _csrf                     │
│   → Frontend reçoit le token et le stocke                        │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. SAISIE UTILISATEUR                                            │
├─────────────────────────────────────────────────────────────────┤
│ Frontend :                                                       │
│   - Utilisateur saisit email + password                          │
│   - Validation format email (regex)                              │
│   - Vérification longueur (255 / 128 chars max)                 │
│   - Trim des espaces                                             │
│   - Vérification présence token CSRF                             │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. SOUMISSION FORMULAIRE                                         │
├─────────────────────────────────────────────────────────────────┤
│ Frontend :                                                       │
│   POST /api/auth/login                                           │
│   Headers:                                                       │
│     - X-CSRF-Token: <token>                                      │
│     - Cookie: _csrf=<cookie>                                     │
│   Body:                                                          │
│     - email: "user@example.com" (toLowerCase)                    │
│     - password: "********"                                       │
│   Options:                                                       │
│     - withCredentials: true                                      │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. MIDDLEWARES BACKEND (ordre d'exécution)                       │
├─────────────────────────────────────────────────────────────────┤
│ a) CORS :                                                        │
│    → Vérification origin dans allowedOrigins                     │
│    → Si non autorisé : 403 Forbidden                             │
│                                                                  │
│ b) csrfProtection :                                              │
│    → Compare X-CSRF-Token avec cookie _csrf                      │
│    → Si mismatch : 403 Forbidden                                 │
│                                                                  │
│ c) loginRateLimit :                                              │
│    → Vérifie tentatives précédentes (IP)                         │
│    → Si > 5 tentatives : 429 Too Many Requests                   │
│    → Sinon : continue                                            │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. VALIDATION ROUTE                                              │
├─────────────────────────────────────────────────────────────────┤
│ Backend (routes/auth.js) :                                       │
│   - validateAndSanitizeLogin(email, password)                    │
│     → Trim + toLowerCase email                                   │
│     → Vérif longueurs max (255/128)                              │
│     → Regex format email                                         │
│     → Si invalide : 400 Bad Request                              │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. VÉRIFICATION CREDENTIALS                                      │
├─────────────────────────────────────────────────────────────────┤
│ Backend :                                                        │
│   - User.findOne({ email: sanitizedEmail })                      │
│   - Si user non trouvé :                                         │
│     → incrementLoginAttempts(req)                                │
│     → 401 Unauthorized + attemptsInfo                            │
│                                                                  │
│   - bcrypt.compare(sanitizedPassword, user.password)             │
│   - Si password invalide :                                       │
│     → incrementLoginAttempts(req)                                │
│     → 401 Unauthorized + attemptsInfo                            │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. SUCCÈS DE CONNEXION                                           │
├─────────────────────────────────────────────────────────────────┤
│ Backend :                                                        │
│   - jwt.sign({ id, email, role }, SECRET, { expiresIn: '1h' })  │
│   - res.cookie('token', jwt, {                                   │
│       httpOnly: true,                                            │
│       sameSite: 'strict',                                        │
│       maxAge: 3600000                                            │
│     })                                                           │
│   - resetLoginAttempts(req)  // Réinitialise le compteur         │
│   - res.json({ success: true, user: {...} })                     │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. RÉPONSE FRONTEND                                              │
├─────────────────────────────────────────────────────────────────┤
│ Frontend :                                                       │
│   - Réception cookie HTTP-only 'token' (automatique)             │
│   - Affichage message succès                                     │
│   - Redirection après 1 seconde                                  │
│   - window.location.reload()                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Sécurité des Routes Protégées

### Routes publiques (pas d'authentification)

| Route | Méthode | Protection |
|-------|---------|------------|
| `/api/auth/csrf-token` | GET | csrfTokenGenerator (génération sans vérification) |
| `/api/auth/login` | POST | csrfProtection + loginRateLimit |

### Routes authentifiées (JWT requis)

| Route | Méthode | Protections |
|-------|---------|-------------|
| `/api/board/` | POST | authenticateToken + csrfProtection |
| `/api/docs/upload` | POST | authenticateToken + csrfProtection + handleUpload |
| `/api/agent/chat` | POST | authenticateToken + csrfProtection |
| `/api/agent/chat/history` | GET | authenticateToken |
| `/api/agent/chat/:id` | DELETE | authenticateToken + csrfProtection |
| `/api/docs/latest` | GET | authenticateToken |
| `/api/docs/:id` | PUT | authenticateToken + csrfProtection |
| `/api/auth/verify` | GET | authenticateToken |

### Routes webhooks (secret n8n requis)

| Route | Méthode | Protection |
|-------|---------|------------|
| `/api/docs/result` | POST | assertN8NSecret |
| `/api/errors` | POST | assertN8NSecret |
| `/api/report_n8n` | POST | assertN8NSecret |

---

## 🎯 Points Forts du Système

### ✅ Frontend

1. **Validation proactive** : Empêche les soumissions invalides avant l'envoi
2. **Token management** : Composant réutilisable pour le CSRF
3. **UX sécurisée** : Feedback temps réel sur les erreurs (attemptsInfo)
4. **Credentials automatiques** : withCredentials sur toutes les requêtes

### ✅ Backend

1. **Defense in depth** : Multiples couches de protection
2. **Validation stricte** : Sanitization + regex + limites de longueur
3. **Rate limiting intelligent** : Réinitialisation automatique après succès
4. **JWT stateless** : Pas de session serveur, scalabilité
5. **Isolation des routes** : Webhooks avec secret partagé

---

## ⚠️ Points d'Amélioration Potentiels

### 🔴 Critiques

1. **JWT Secret hardcodé** : 
   ```javascript
   // ❌ Mauvaise pratique
   const JWT_SECRET = 'vitalinfo-jwt-secret-key-2024';
   
   // ✅ Recommandation
   const JWT_SECRET = process.env.JWT_SECRET;
   ```

2. **Cookie `secure: false`** :
   ```javascript
   // ❌ En production
   secure: false
   
   // ✅ Recommandation
   secure: process.env.NODE_ENV === 'production'
   ```

3. **Rate limiting en mémoire** :
   - Problème : Perte des données au redémarrage
   - Risque : Contournement avec multi-instances
   - Solution : Utiliser Redis pour le stockage distribué

### 🟡 Améliorations

1. **Logging de sécurité** :
   - Ajouter des logs détaillés pour les tentatives de connexion
   - Monitorer les échecs CSRF
   - Alerter sur les tentatives de brute force

2. **Refresh token** :
   - Implémenter un système de refresh pour éviter la déconnexion
   - Stocker le refresh token en base de données

3. **Captcha** :
   - Ajouter un CAPTCHA après 3 tentatives échouées
   - Utiliser hCaptcha ou reCAPTCHA v3

4. **Content Security Policy (CSP)** :
   - Ajouter des headers CSP pour prévenir XSS
   - Configurer dans Express ou Apache

5. **Validation TypeScript** :
   - Utiliser Zod ou Yup pour validation typée
   - Générer des types partagés frontend/backend

---

## 📈 Métriques de Sécurité

| Métrique | État Actuel | Niveau |
|----------|-------------|--------|
| Protection CSRF | ✅ Double Submit Cookie | **Élevé** |
| Authentification | ✅ JWT HTTP-only | **Élevé** |
| Rate Limiting | ✅ 5 tentatives / 15 min | **Moyen** |
| Input Validation | ✅ Frontend + Backend | **Élevé** |
| CORS | ✅ Whitelist stricte | **Élevé** |
| File Upload | ✅ Type + taille | **Moyen** |
| HTTPS | ✅ Apache reverse proxy | **Élevé** |
| Secrets Management | ⚠️ Hardcodés | **Faible** |
| Cookie Security | ⚠️ secure: false | **Moyen** |
| Monitoring | ❌ Pas de monitoring | **Faible** |

**Score global** : 7.5/10 (Bon niveau de sécurité avec quelques améliorations à apporter)

---

## 🛠️ Configuration Recommandée

### Variables d'environnement à ajouter

```bash
# .env
JWT_SECRET=<générer avec openssl rand -hex 32>
JWT_REFRESH_SECRET=<générer avec openssl rand -hex 32>
CSRF_SECRET=<générer avec openssl rand -hex 32>
NODE_ENV=production
COOKIE_SECURE=true
RATE_LIMIT_STORE=redis  # ou mysql
REDIS_URL=redis://localhost:6379
```

### Headers de sécurité à ajouter (Express)

```javascript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## 📚 Ressources et Standards

### Standards appliqués

- **OWASP Top 10** : Protection contre la plupart des vulnérabilités
- **Double Submit Cookie Pattern** : Standard CSRF
- **JWT Best Practices** : HTTP-only cookies + expiration courte
- **Bcrypt** : Hashing de mots de passe avec salt

### Documentation

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [JWT Security Best Practices](https://tools.ietf.org/html/rfc8725)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

## 🎓 Conclusion

Le projet VitalInfo implémente un **système de protection solide** avec une architecture multicouches bien pensée. La combinaison de validations frontend/backend, de tokens CSRF, de rate limiting et d'authentification JWT offre une défense robuste contre les attaques courantes.

Les points critiques à corriger rapidement :
1. Externaliser le JWT secret en variable d'environnement
2. Activer `secure: true` pour les cookies en production
3. Implémenter un système de monitoring des tentatives de connexion

Avec ces améliorations, le niveau de sécurité passera de **7.5/10 à 9/10**.

