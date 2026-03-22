#!/bin/bash

# 🚀 Script de Migration - Security Logs
# Exécutez ce script pour créer la table security_logs

echo "🔄 Exécution de la migration security_logs..."
echo ""

# Se placer dans le dossier backend
cd "$(dirname "$0")"

# Exécuter la migration
npx sequelize-cli db:migrate

echo ""
echo "✅ Migration terminée !"
echo ""
echo "📊 Vérification du statut des migrations :"
npx sequelize-cli db:migrate:status

echo ""
echo "🎯 Prochaines étapes :"
echo "1. Vérifier que la migration s'est bien passée ci-dessus"
echo "2. Ajouter le logging dans /routes/auth.js (voir GUIDE_MONITORING.md)"
echo "3. Accéder à l'interface : https://vitalinfo.site/#security"
echo ""


