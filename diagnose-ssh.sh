#!/bin/bash
# Script de diagnostic SSH pour le serveur
# À exécuter sur le serveur VPS

echo "=== Diagnostic SSH ==="
echo ""

echo "1. Statut du service SSH:"
sudo systemctl status sshd | head -10
echo ""

echo "2. Dernières connexions SSH (succès):"
sudo tail -20 /var/log/auth.log | grep "Accepted" || sudo tail -20 /var/log/secure | grep "Accepted"
echo ""

echo "3. Dernières tentatives échouées SSH:"
sudo tail -20 /var/log/auth.log | grep -i "failed\|refused\|reset" || sudo tail -20 /var/log/secure | grep -i "failed\|refused\|reset"
echo ""

echo "4. Vérification Fail2ban (si installé):"
if command -v fail2ban-client &> /dev/null; then
    echo "Fail2ban installé:"
    sudo fail2ban-client status sshd 2>/dev/null || echo "  Service sshd non trouvé dans fail2ban"
    echo "Bannissements actifs:"
    sudo fail2ban-client status sshd 2>/dev/null | grep "Banned IP list" || echo "  Aucun bannissement trouvé"
else
    echo "Fail2ban non installé"
fi
echo ""

echo "5. Configuration SSH (MaxStartups et connexions):"
sudo grep -E "MaxStartups|MaxSessions|MaxAuthTries" /etc/ssh/sshd_config || echo "  Paramètres par défaut"
echo ""

echo "6. Connexions SSH actives:"
sudo netstat -an | grep :22 | grep ESTABLISHED | wc -l
echo "Connexions établies sur le port 22"
echo ""

echo "7. Processus SSH en cours:"
ps aux | grep sshd | grep -v grep | wc -l
echo "Processus sshd actifs"
echo ""

echo "8. Vérification des clés autorisées:"
if [ -f ~/.ssh/authorized_keys ]; then
    echo "Nombre de clés dans authorized_keys:"
    wc -l ~/.ssh/authorized_keys
    echo "Permissions du fichier:"
    ls -la ~/.ssh/authorized_keys
else
    echo "Fichier authorized_keys non trouvé"
fi
echo ""

echo "9. Vérification du rate limiting (journalctl):"
sudo journalctl -u sshd --since "10 minutes ago" --no-pager | tail -30
echo ""

echo "=== Fin du diagnostic ==="
echo ""
echo "Actions suggérées:"
echo "- Si Fail2ban a bloqué une IP, utiliser: sudo fail2ban-client set sshd unbanip <IP>"
echo "- Si trop de connexions, vérifier MaxStartups dans /etc/ssh/sshd_config"
echo "- Redémarrer SSH: sudo systemctl restart sshd"

