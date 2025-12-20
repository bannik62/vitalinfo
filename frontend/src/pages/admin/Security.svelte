<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import Navbar from '../../modules/module_navbar/Navbar.svelte';

  let loading = true;
  let error = null;
  let period = '24h';
  let stats = null;
  let logs = [];
  let selectedIP = null;

  // Charger les statistiques
  async function loadStats() {
    loading = true;
    error = null;

    try {
      const response = await axios.get(`/api/security/stats?period=${period}`, {
        withCredentials: true
      });
      stats = response.data;
    } catch (err) {
      error = err.response?.data?.error || 'Erreur lors du chargement des statistiques';
      console.error('Erreur:', err);
    } finally {
      loading = false;
    }
  }

  // Charger les logs récents
  async function loadLogs(ip = null) {
    try {
      const url = ip 
        ? `/api/security/logs?limit=20&ip=${ip}`
        : '/api/security/logs?limit=20';
      
      const response = await axios.get(url, {
        withCredentials: true
      });
      logs = response.data.logs;
    } catch (err) {
      console.error('Erreur lors du chargement des logs:', err);
    }
  }

  // Changer la période
  function changePeriod(newPeriod) {
    period = newPeriod;
    loadStats();
  }

  // Voir les détails d'une IP
  function viewIPDetails(ip) {
    selectedIP = ip;
    loadLogs(ip);
  }

  // Retour à la vue globale
  function backToGlobal() {
    selectedIP = null;
    loadLogs();
  }

  // Formater la date
  function formatDate(dateString) {
    return new Date(dateString).toLocaleString('fr-FR');
  }

  // Obtenir la couleur selon la sévérité
  function getSeverityColor(severity) {
    const colors = {
      INFO: '#3498db',
      WARNING: '#f39c12',
      HIGH: '#e67e22',
      CRITICAL: '#e74c3c'
    };
    return colors[severity] || '#95a5a6';
  }

  // Obtenir l'emoji selon le type
  function getTypeEmoji(type) {
    const emojis = {
      LOGIN_SUCCESS: '✅',
      LOGIN_FAILED: '❌',
      CSRF_ATTACK: '🔥',
      RATE_LIMIT_BLOCKED: '🚫'
    };
    return emojis[type] || '📝';
  }

  onMount(() => {
    loadStats();
    loadLogs();
  });
</script>

<Navbar />

<div class="security-dashboard">
  <div class="header">
    <h1>🛡️ Tableau de Bord Sécurité</h1>
    
    <div class="period-selector">
      <button 
        class:active={period === '1h'} 
        on:click={() => changePeriod('1h')}
      >
        1 heure
      </button>
      <button 
        class:active={period === '24h'} 
        on:click={() => changePeriod('24h')}
      >
        24 heures
      </button>
      <button 
        class:active={period === '7d'} 
        on:click={() => changePeriod('7d')}
      >
        7 jours
      </button>
      <button 
        class:active={period === '30d'} 
        on:click={() => changePeriod('30d')}
      >
        30 jours
      </button>
    </div>
  </div>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Chargement des statistiques...</p>
    </div>
  {:else if error}
    <div class="error-message">
      <p>❌ {error}</p>
    </div>
  {:else if stats}
    <!-- Statistiques Globales -->
    <div class="stats-grid">
      {#each stats.statsByType as stat}
        <div class="stat-card">
          <div class="stat-emoji">{getTypeEmoji(stat.type)}</div>
          <div class="stat-value">{stat.count}</div>
          <div class="stat-label">{stat.type.replace(/_/g, ' ')}</div>
        </div>
      {/each}
    </div>

    <!-- Sévérité -->
    {#if stats.statsBySeverity.length > 0}
      <div class="severity-section">
        <h2>📊 Par Sévérité</h2>
        <div class="severity-bars">
          {#each stats.statsBySeverity as severity}
            <div class="severity-bar">
              <span class="severity-label">{severity.severity}</span>
              <div class="bar-container">
                <div 
                  class="bar-fill" 
                  style="width: {(severity.count / Math.max(...stats.statsBySeverity.map(s => s.count))) * 100}%; background-color: {getSeverityColor(severity.severity)}"
                ></div>
              </div>
              <span class="severity-count">{severity.count}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Top IPs Suspectes -->
    {#if stats.topIPs.length > 0}
      <div class="top-ips-section">
        <h2>🌍 Top IPs Suspectes</h2>
        {#if selectedIP}
          <button class="back-button" on:click={backToGlobal}>← Retour</button>
          <p class="selected-ip-info">Détails pour l'IP : <strong>{selectedIP}</strong></p>
        {/if}
        
        {#if !selectedIP}
          <div class="ips-table">
            <table>
              <thead>
                <tr>
                  <th>IP</th>
                  <th>Tentatives</th>
                  <th>Dernière tentative</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each stats.topIPs as ipData}
                  <tr>
                    <td class="ip-cell">{ipData.ip}</td>
                    <td class="attempts-cell">{ipData.attempts}</td>
                    <td>{formatDate(ipData.lastAttempt)}</td>
                    <td>
                      <button 
                        class="details-btn" 
                        on:click={() => viewIPDetails(ipData.ip)}
                      >
                        Détails
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Top Emails Ciblés -->
    {#if stats.topEmails.length > 0}
      <div class="top-emails-section">
        <h2>📧 Emails les Plus Ciblés</h2>
        <div class="emails-list">
          {#each stats.topEmails as emailData}
            <div class="email-item">
              <span class="email">{emailData.email}</span>
              <span class="badge">{emailData.attempts} tentatives</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Logs Récents -->
    {#if logs.length > 0}
      <div class="logs-section">
        <h2>📝 Logs Récents {selectedIP ? `(${selectedIP})` : ''}</h2>
        <div class="logs-container">
          {#each logs as log}
            <div class="log-entry" style="border-left: 4px solid {getSeverityColor(log.severity)}">
              <div class="log-header">
                <span class="log-type">{getTypeEmoji(log.type)} {log.type}</span>
                <span class="log-severity" style="color: {getSeverityColor(log.severity)}">{log.severity}</span>
              </div>
              <div class="log-details">
                <div><strong>IP:</strong> {log.ip}</div>
                {#if log.email}
                  <div><strong>Email:</strong> {log.email}</div>
                {/if}
                {#if log.reason}
                  <div><strong>Raison:</strong> {log.reason}</div>
                {/if}
                <div><strong>Date:</strong> {formatDate(log.createdAt)}</div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .security-dashboard {
    max-width: 1400px;
    margin: 0 auto;
    padding: clamp(1rem, 3vw, 2rem);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
    flex-wrap: wrap;
    gap: 1rem;
  }

  h1 {
    font-size: clamp(1.5rem, 4vw, 2.5rem);
    color: #2c3e50;
    margin: 0;
  }

  h2 {
    font-size: clamp(1.2rem, 3vw, 1.8rem);
    color: #34495e;
    margin-bottom: 1rem;
  }

  .period-selector {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .period-selector button {
    padding: 0.5rem 1rem;
    border: 2px solid #3498db;
    background: white;
    color: #3498db;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 500;
  }

  .period-selector button.active,
  .period-selector button:hover {
    background: #3498db;
    color: white;
  }

  .loading {
    text-align: center;
    padding: 3rem;
  }

  .spinner {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-message {
    background: #fee;
    border: 2px solid #e74c3c;
    color: #c0392b;
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    text-align: center;
    transition: transform 0.3s ease;
  }

  .stat-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  .stat-emoji {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: #2c3e50;
  }

  .stat-label {
    font-size: 0.9rem;
    color: #7f8c8d;
    text-transform: capitalize;
  }

  .severity-section,
  .top-ips-section,
  .top-emails-section,
  .logs-section {
    background: white;
    padding: clamp(1rem, 3vw, 2rem);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
  }

  .severity-bars {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .severity-bar {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .severity-label {
    min-width: 100px;
    font-weight: 600;
  }

  .bar-container {
    flex: 1;
    height: 30px;
    background: #ecf0f1;
    border-radius: 15px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    transition: width 0.5s ease;
  }

  .severity-count {
    min-width: 50px;
    text-align: right;
    font-weight: bold;
  }

  .back-button {
    padding: 0.5rem 1rem;
    background: #3498db;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    margin-bottom: 1rem;
  }

  .selected-ip-info {
    color: #7f8c8d;
    margin-bottom: 1rem;
  }

  .ips-table {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid #ecf0f1;
  }

  th {
    background: #f8f9fa;
    font-weight: 600;
    color: #2c3e50;
  }

  .ip-cell {
    font-family: monospace;
    color: #e74c3c;
    font-weight: 600;
  }

  .attempts-cell {
    font-weight: bold;
    color: #e67e22;
  }

  .details-btn {
    padding: 0.4rem 1rem;
    background: #3498db;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .details-btn:hover {
    background: #2980b9;
  }

  .emails-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .email-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8rem;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .email {
    font-weight: 500;
  }

  .badge {
    background: #e74c3c;
    color: white;
    padding: 0.3rem 0.8rem;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .logs-container {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    max-height: 600px;
    overflow-y: auto;
  }

  .log-entry {
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .log-type {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .log-severity {
    font-weight: bold;
    font-size: 0.85rem;
  }

  .log-details {
    font-size: 0.9rem;
    color: #7f8c8d;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  @media (max-width: 768px) {
    .header {
      flex-direction: column;
      align-items: stretch;
    }

    .period-selector {
      justify-content: center;
    }

    .stats-grid {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    table {
      font-size: 0.9rem;
    }

    th, td {
      padding: 0.5rem;
    }
  }
</style>

