# 🚀 Instructions pour Exécuter la Migration

## Avant de Push (en Local ou sur le VPS)

### 📋 Commandes à Exécuter

```bash
# 1. Se placer dans le dossier backend
cd /home/yo/project/vitalinfo/backend

# 2. Exécuter la migration
npx sequelize-cli db:migrate

# 3. Vérifier que la table a été créée
npx sequelize-cli db:migrate:status
```

---

## ✅ Résultat Attendu

Vous devriez voir :

```bash
== 20241220120000-create-security-logs: migrating =======
== 20241220120000-create-security-logs: migrated (0.234s)

Loaded configuration file "config/config.json".
Using environment "development".

up 20251121151308-create-blocked-ip.cjs
up 20251123145108-create-chat-conversation.cjs
up 20241220120000-create-security-logs.cjs  ← NOUVELLE MIGRATION
```

---

## 🔄 Si la Migration Échoue

### Annuler la migration (rollback)

```bash
npx sequelize-cli db:migrate:undo
```

### Recommencer

```bash
npx sequelize-cli db:migrate
```

---

## 🐳 Si Vous Utilisez Docker

```bash
# Entrer dans le container backend
docker exec -it vitalinfo-backend bash

# Puis exécuter la migration
cd /app
npx sequelize-cli db:migrate

# Sortir du container
exit
```

---

## 📊 Vérifier la Table en BDD

### Via MySQL

```bash
# Se connecter à MySQL
mysql -u root -p vitalinfo

# Vérifier la structure
DESCRIBE security_logs;

# Vérifier les index
SHOW INDEX FROM security_logs;

# Quitter
exit
```

### Résultat Attendu

```
+-----------+--------------------------------------------------+------+-----+---------+----------------+
| Field     | Type                                             | Null | Key | Default | Extra          |
+-----------+--------------------------------------------------+------+-----+---------+----------------+
| id        | int(11)                                          | NO   | PRI | NULL    | auto_increment |
| type      | varchar(50)                                      | NO   | MUL | NULL    |                |
| severity  | enum('INFO','WARNING','HIGH','CRITICAL')         | NO   | MUL | INFO    |                |
| ip        | varchar(45)                                      | NO   | MUL | NULL    |                |
| email     | varchar(255)                                     | YES  | MUL | NULL    |                |
| reason    | varchar(100)                                     | YES  |     | NULL    |                |
| userAgent | text                                             | YES  |     | NULL    |                |
| path      | varchar(255)                                     | YES  |     | NULL    |                |
| origin    | varchar(255)                                     | YES  |     | NULL    |                |
| metadata  | json                                             | YES  |     | NULL    |                |
| createdAt | datetime                                         | NO   | MUL | NULL    |                |
| updatedAt | datetime                                         | NO   |     | NULL    |                |
+-----------+--------------------------------------------------+------+-----+---------+----------------+
12 rows in set (0.00 sec)
```

---

## 🎯 Une Fois la Migration Exécutée

Vous pouvez :
1. ✅ **Push votre code** sur Git
2. ✅ **Déployer** sur le serveur
3. ✅ **Accéder à l'interface** : `https://vitalinfo.site/#security`

---

## ⚠️ Important

- La migration créera **automatiquement** la table `security_logs`
- Les **index** seront créés pour optimiser les performances
- La structure est **compatible** avec le modèle `SecurityLog.mjs`

---

## 🔍 Tester l'Interface après Migration

1. Connectez-vous à VitalInfo
2. Cliquez sur **🛡️ Sécurité** dans la navbar
3. Vous devriez voir l'interface de monitoring (vide au début)
4. Faites quelques tentatives de login pour générer des logs
5. Rechargez l'interface pour voir les données

---

## 📝 Checklist

- [ ] Migration exécutée avec succès
- [ ] Table `security_logs` créée
- [ ] Index créés
- [ ] Logging ajouté dans `/backend/routes/auth.js`
- [ ] Interface accessible sur `/#security`
- [ ] Données visibles dans l'interface

---

Tout est prêt ! Il suffit d'exécuter `npx sequelize-cli db:migrate` avant de push ! 🚀


