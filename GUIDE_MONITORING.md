# 🛡️ Guide d'Implémentation du Monitoring de Sécurité - VitalInfo

## 📁 Structure Complète

```
vitalinfo/
├── backend/
│   ├── models/
│   │   └── SecurityLog.mjs                    ← Modèle BDD pour les logs
│   ├── routes/
│   │   ├── auth.js                            ← Routes authentification
│   │   └── security.js                        ← 🆕 Routes API monitoring
│   ├── utils/
│   │   ├── securityLogger.js                  ← 🆕 Fonctions de logging
│   │   └── securityAlerts.js                  ← 🆕 Alertes email (optionnel)
│   ├── examples/
│   │   └── auth_with_monitoring.js            ← 🆕 Exemple d'utilisation
│   └── index.js                               ← ✏️ Modifié (ajout route security)
│
└── frontend/
    └── src/
        ├── pages/
        │   └── admin/
        │       └── Security.svelte            ← 🆕 Interface de monitoring
        ├── modules/
        │   └── module_navbar/
        │       └── Navbar.svelte              ← ✏️ Modifié (ajout bouton Sécurité)
        └── App.svelte                         ← ✏️ Modifié (ajout route #security)
```

---

## 🚀 Étapes pour Activer le Monitoring

### 1️⃣ **Créer la Table en Base de Données**

Exécutez cette migration SQL :

```sql
CREATE TABLE security_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL COMMENT 'LOGIN_FAILED, CSRF_ATTACK, etc.',
  severity ENUM('INFO', 'WARNING', 'HIGH', 'CRITICAL') DEFAULT 'INFO',
  ip VARCHAR(45) NOT NULL COMMENT 'IPv4 ou IPv6',
  email VARCHAR(255) NULL COMMENT 'Email tenté (si applicable)',
  reason VARCHAR(100) NULL COMMENT 'USER_NOT_FOUND, INVALID_PASSWORD, etc.',
  userAgent TEXT NULL,
  path VARCHAR(255) NULL COMMENT 'Route appelée',
  origin VARCHAR(255) NULL COMMENT 'Origin header (pour CSRF)',
  metadata JSON NULL COMMENT 'Données additionnelles',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_type (type),
  INDEX idx_severity (severity),
  INDEX idx_ip (ip),
  INDEX idx_email (email),
  INDEX idx_created_at (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2️⃣ **Vérifier les Imports Backend**

Assurez-vous que le fichier `/backend/utils/securityLogger.js` a les imports nécessaires :

```javascript
import SecurityLog from '../models/SecurityLog.mjs';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
```

---

### 3️⃣ **Ajouter le Logging dans les Routes Existantes**

#### Exemple : Route de Login

Dans `/backend/routes/auth.js`, ajoutez :

```javascript
import { logSecurityEvent, getClientIP } from '../utils/securityLogger.js';

router.post('/login', csrfProtection, loginRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    const validation = validateAndSanitizeLogin(email, password);
    
    if (!validation.valid) {
      // 🔍 Log tentative invalide
      await logSecurityEvent({
        type: 'LOGIN_ATTEMPT_INVALID_DATA',
        severity: 'INFO',
        ip: getClientIP(req),
        email: email?.substring(0, 255),
        reason: validation.error,
        userAgent: req.headers['user-agent'],
        path: req.path
      });
      
      return res.status(400).json({ error: validation.error });
    }

    const user = await User.findOne({ where: { email: validation.email } });

    if (!user) {
      await incrementLoginAttempts(req);
      
      // 🔍 Log compte inexistant
      await logSecurityEvent({
        type: 'LOGIN_FAILED',
        severity: 'WARNING',
        ip: getClientIP(req),
        email: validation.email,
        reason: 'USER_NOT_FOUND',
        userAgent: req.headers['user-agent'],
        path: req.path
      });
      
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const isValid = await bcrypt.compare(validation.password, user.password);

    if (!isValid) {
      await incrementLoginAttempts(req);
      
      // 🔍 Log mauvais mot de passe
      await logSecurityEvent({
        type: 'LOGIN_FAILED',
        severity: 'WARNING',
        ip: getClientIP(req),
        email: validation.email,
        reason: 'INVALID_PASSWORD',
        userAgent: req.headers['user-agent'],
        path: req.path
      });
      
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // ✅ Connexion réussie
    const token = jwt.sign(/*...*/);
    res.cookie('token', token, {/*...*/});
    await resetLoginAttempts(req);

    // 🔍 Log connexion réussie
    await logSecurityEvent({
      type: 'LOGIN_SUCCESS',
      severity: 'INFO',
      ip: getClientIP(req),
      email: validation.email,
      userAgent: req.headers['user-agent'],
      path: req.path,
      metadata: { userId: user.id, role: user.role }
    });

    res.json({ success: true, user: {/*...*/} });
  } catch (error) {
    // 🔍 Log erreur serveur
    await logSecurityEvent({
      type: 'LOGIN_ERROR',
      severity: 'CRITICAL',
      ip: getClientIP(req),
      reason: error.message,
      path: req.path
    });
    
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
```

---

### 4️⃣ **Ajouter le Logging CSRF**

Dans `/backend/middleware/csrf.js` :

```javascript
import { logSecurityEvent, getClientIP } from '../utils/securityLogger.js';

const csrfProtection = (req, res, next) => {
  csrf({/*...*/})(req, res, (err) => {
    if (err) {
      // 🚨 Log tentative CSRF
      logSecurityEvent({
        type: 'CSRF_ATTACK',
        severity: 'CRITICAL',
        ip: getClientIP(req),
        origin: req.headers.origin,
        referer: req.headers.referer,
        path: req.path,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(403).json({ error: 'Token CSRF invalide' });
    }
    next();
  });
};
```

---

### 5️⃣ **Ajouter le Logging Rate Limit**

Dans `/backend/middleware/rateLimit.js` :

```javascript
import { logSecurityEvent, getClientIP } from '../utils/securityLogger.js';

export const loginRateLimit = (req, res, next) => {
  cleanExpiredAttempts();
  const clientIP = getClientIP(req);
  const now = Date.now();
  const attemptData = loginAttempts.get(clientIP);

  if (attemptData?.blocked) {
    if (now < attemptData.blockedUntil) {
      
      // 🚫 Log IP bloquée
      logSecurityEvent({
        type: 'RATE_LIMIT_BLOCKED',
        severity: 'HIGH',
        ip: clientIP,
        reason: `IP bloquée après ${MAX_ATTEMPTS} tentatives`,
        userAgent: req.headers['user-agent'],
        path: req.path,
        metadata: {
          attempts: attemptData.count,
          blockedUntil: new Date(attemptData.blockedUntil)
        }
      });
      
      return res.status(429).json({/*...*/});
    }
  }
  
  next();
};
```

---

## 🎯 Comment Accéder à l'Interface

### Pour les Administrateurs

1. **Connectez-vous** à VitalInfo
2. Dans la navbar, cliquez sur **🛡️ Sécurité**
3. Vous arriverez sur : `https://vitalinfo.site/#security`

### Interface Disponible

L'interface montre :
- 📊 **Statistiques par type** (LOGIN_FAILED, CSRF_ATTACK, etc.)
- 📈 **Statistiques par sévérité** (INFO, WARNING, HIGH, CRITICAL)
- 🌍 **Top IPs suspectes** (avec nombre de tentatives)
- 📧 **Emails les plus ciblés**
- 📝 **Logs en temps réel** (20 derniers événements)
- ⏱️ **Filtres temporels** (1h, 24h, 7j, 30j)

---

## 🔐 Sécurité de l'Interface

### Protection Mise en Place

```javascript
// Backend : routes/security.js
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Accès réservé aux administrateurs' 
    });
  }
  next();
};

router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  // Seuls les admins peuvent accéder
});
```

### Qui Peut Accéder ?

✅ **Utilisateurs avec `role = 'admin'`**
❌ **Tous les autres utilisateurs**

---

## 📊 Exemple de Données Affichées

### Vue Globale (24h)

```
┌─────────────────────────────────────────┐
│  📊 Statistiques de Sécurité (24h)      │
├─────────────────────────────────────────┤
│  ✅ LOGIN_SUCCESS       : 145           │
│  ❌ LOGIN_FAILED        : 87            │
│  🚫 RATE_LIMIT_BLOCKED  : 12            │
│  🔥 CSRF_ATTACK         : 3             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  🌍 Top IPs Suspectes                   │
├─────────────────────────────────────────┤
│  1. 192.168.1.100  : 45 tentatives      │
│  2. 10.0.0.50      : 32 tentatives      │
│  3. 172.16.0.20    : 10 tentatives      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📧 Emails les Plus Ciblés              │
├─────────────────────────────────────────┤
│  admin@vitalinfo.site  : 28 tentatives  │
│  test@test.com         : 15 tentatives  │
└─────────────────────────────────────────┘
```

---

## 🔧 Configuration Optionnelle

### Alertes Email (Optionnel)

Si vous voulez recevoir des alertes par email, configurez dans `.env` :

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app
SMTP_FROM=security@vitalinfo.site
SECURITY_ALERT_EMAIL=admin@vitalinfo.site
SECURITY_REPORT_EMAIL=admin@vitalinfo.site
```

Puis ajoutez un cron job :

```javascript
// backend/index.js
import { checkAndAlertAttacks, generateDailySecurityReport } from './utils/securityAlerts.js';

// Vérifier les attaques toutes les 5 minutes
setInterval(checkAndAlertAttacks, 5 * 60 * 1000);

// Rapport quotidien à minuit
setInterval(generateDailySecurityReport, 24 * 60 * 60 * 1000);
```

---

## 📈 Métriques Disponibles via API

### Endpoints Créés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/security/stats` | GET | Statistiques de sécurité (avec période) |
| `/api/security/logs` | GET | Liste des logs (avec filtres) |
| `/api/security/logs/old` | DELETE | Nettoie les anciens logs (> 30j) |
| `/api/security/block-ip` | POST | Bloque manuellement une IP |

### Exemples de Requêtes

```bash
# Statistiques des dernières 24h
curl -X GET "https://vitalinfo.site/api/security/stats?period=24h" \
  --cookie "token=..." \
  -H "Content-Type: application/json"

# Logs récents
curl -X GET "https://vitalinfo.site/api/security/logs?limit=50" \
  --cookie "token=..." \
  -H "Content-Type: application/json"

# Logs d'une IP spécifique
curl -X GET "https://vitalinfo.site/api/security/logs?ip=192.168.1.100" \
  --cookie "token=..." \
  -H "Content-Type: application/json"
```

---

## 🎨 Personnalisation de l'Interface

L'interface est entièrement personnalisable dans :
`/frontend/src/pages/admin/Security.svelte`

### Couleurs par Sévérité

```javascript
function getSeverityColor(severity) {
  switch (severity) {
    case 'INFO': return '#3498db';      // Bleu
    case 'WARNING': return '#f39c12';   // Orange
    case 'HIGH': return '#e67e22';      // Orange foncé
    case 'CRITICAL': return '#e74c3c';  // Rouge
  }
}
```

### Emojis par Type

```javascript
function getTypeEmoji(type) {
  switch (type) {
    case 'LOGIN_SUCCESS': return '✅';
    case 'LOGIN_FAILED': return '❌';
    case 'CSRF_ATTACK': return '🔥';
    case 'RATE_LIMIT_BLOCKED': return '🚫';
  }
}
```

---

## 🧹 Maintenance

### Nettoyage Automatique

Les logs de sévérité INFO et WARNING sont automatiquement supprimés après 30 jours.
Les logs HIGH et CRITICAL sont conservés indéfiniment.

Pour nettoyer manuellement :

```javascript
// Via l'API
DELETE /api/security/logs/old
```

---

## ✅ Checklist d'Implémentation

- [ ] 1. Créer la table `security_logs` en BDD
- [ ] 2. Vérifier que tous les fichiers backend sont créés
- [ ] 3. Ajouter le logging dans `/backend/routes/auth.js`
- [ ] 4. Ajouter le logging dans `/backend/middleware/csrf.js`
- [ ] 5. Ajouter le logging dans `/backend/middleware/rateLimit.js`
- [ ] 6. Tester l'accès à `/api/security/stats`
- [ ] 7. Vérifier que le bouton "Sécurité" apparaît dans la navbar (admin uniquement)
- [ ] 8. Tester l'interface sur `/#security`
- [ ] 9. (Optionnel) Configurer les alertes email
- [ ] 10. (Optionnel) Mettre en place les rapports quotidiens

---

## 🎯 Résultat Final

Une fois implémenté, vous aurez :

✅ **Visibilité totale** sur les tentatives de connexion
✅ **Détection des attaques** en temps réel
✅ **Historique complet** des événements de sécurité
✅ **Interface intuitive** pour analyser les menaces
✅ **Aucun service externe** requis (tout en interne)
✅ **Performance optimale** (indexation BDD)
✅ **Sécurisé** (accès admin uniquement)

---

## 📞 Support

Si vous avez besoin d'aide pour l'implémentation, n'hésitez pas à demander ! 🚀


