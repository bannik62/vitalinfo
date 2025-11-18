<script>
  import { onDestroy, afterUpdate } from 'svelte';
  import axios from 'axios';
  import Securecsrf from '../security/module_csrf/Securecsrf.svelte';
  import Navbar from '../module_navbar/Navbar.svelte';

  let csrfToken = null;

  // Upload
  let selectedFile = null;
  let uploadLoading = false;
  let uploadMessage = '';
  let uploadMessageType = '';
  let fileInput;

  // Chat
  let chatInput = '';
  let chatLoading = false;
  let chatMessage = '';
  let chatHistory = [];
  let chatHistoryContainer;

  // Documents
  let docs = [];
  let docsLoading = false;
  let docsError = '';
  let pollingInterval = null;
  let initialDocsCount = 0;

  function handleCsrfTokenReceived(event) {
    csrfToken = event.detail;
    fetchLatestDocs();
  }

  function handleFileChange(event) {
    const [file] = event.target.files;
    selectedFile = file;
    uploadMessage = '';
  }

  async function uploadDocument() {
    if (!selectedFile) {
      uploadMessage = 'Veuillez sélectionner un fichier PDF.';
      uploadMessageType = 'error';
      return;
    }

    if (!csrfToken) {
      uploadMessage = 'Token CSRF indisponible. Rechargez la page.';
      uploadMessageType = 'error';
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    uploadLoading = true;
    uploadMessage = '';

    try {
      await axios.post('/api/docs/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-CSRF-Token': csrfToken
        },
        withCredentials: true
      });

      uploadMessage = 'Document transmis à n8n. Traitement en cours…';
      uploadMessageType = 'success';
      selectedFile = null;
      // Réinitialiser l'input file
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Sauvegarder le nombre initial de documents
      initialDocsCount = docs.length;
      
      // Démarrer le polling pour vérifier les nouveaux documents
      startPollingForNewDoc();
    } catch (error) {
      uploadMessage =
        error.response?.data?.error || "Erreur lors de l'envoi du document.";
      uploadMessageType = 'error';
    } finally {
      uploadLoading = false;
    }
  }

  async function sendChatMessage() {
    if (!chatInput.trim()) {
      chatMessage = 'Merci de saisir une question.';
      return;
    }

    if (!csrfToken) {
      chatMessage = 'Token CSRF indisponible. Rechargez la page.';
      return;
    }

    const userMessage = { from: 'Vous', text: chatInput };
    chatHistory = [...chatHistory, userMessage];

    chatLoading = true;
    chatMessage = '';

    try {
      const response = await axios.post(
        '/api/agent/chat',
        { message: chatInput },
        {
          headers: { 'X-CSRF-Token': csrfToken },
          withCredentials: true
        }
      );

      const agentReply = {
        from: 'Agent IA',
        text: response.data?.answer || 'Réponse reçue.'
      };
      chatHistory = [...chatHistory, agentReply];
      chatInput = '';
      scrollToBottom();
    } catch (error) {
      chatMessage =
        error.response?.data?.error ||
        "Impossible de contacter l'agent pour le moment.";
    } finally {
      chatLoading = false;
    }
  }

  function normalizeDoc(doc) {
    const clone = { ...doc };
    if (typeof clone.fields === 'string') {
      try {
        clone.fieldsParsed = JSON.parse(clone.fields);
      } catch {
        clone.fieldsParsed = null;
      }
    } else {
      clone.fieldsParsed = clone.fields || null;
    }

    if (typeof clone.binary_reference === 'string') {
      try {
        clone.binary_reference = JSON.parse(clone.binary_reference);
      } catch {
        clone.binary_reference = null;
      }
    }

    // Construire l'URL publique Supabase si binary_reference existe mais pas publicUrl
    if (clone.binary_reference && !clone.binary_reference.publicUrl) {
      const { bucket, key } = clone.binary_reference;
      if (bucket && key) {
        // Si key commence déjà par bucket/, utiliser key directement, sinon ajouter bucket/
        const path = key.startsWith(`${bucket}/`) ? key : `${bucket}/${key}`;
        clone.binary_reference.publicUrl = `https://zuvzpcfrbheqeqbiottv.supabase.co/storage/v1/object/public/${path}`;
      }
    }

    return clone;
  }

  async function fetchLatestDocs() {
    docsLoading = true;
    docsError = '';
    try {
      const response = await axios.get('/api/docs/latest', {
        withCredentials: true
      });
      const docsRaw = response.data?.documents || [];
      const newDocs = docsRaw.map((doc) => normalizeDoc(doc));
      
      // Vérifier si un nouveau document est arrivé
      if (uploadMessage && newDocs.length > initialDocsCount) {
        uploadMessage = '';
        uploadMessageType = '';
        stopPollingForNewDoc();
      }
      
      docs = newDocs;
    } catch (error) {
      docsError =
        error.response?.data?.error ||
        'Impossible de récupérer les documents récents.';
    } finally {
      docsLoading = false;
    }
  }

  function startPollingForNewDoc() {
    // Arrêter le polling précédent s'il existe
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    // Poller toutes les 3 secondes (sans afficher le loader)
    pollingInterval = setInterval(async () => {
      await fetchLatestDocsSilently();
    }, 3000);
    
    // Arrêter après 2 minutes maximum
    setTimeout(() => {
      stopPollingForNewDoc();
      if (uploadMessage) {
        uploadMessage = '';
        uploadMessageType = '';
      }
    }, 120000);
  }

  async function fetchLatestDocsSilently() {
    try {
      const response = await axios.get('/api/docs/latest', {
        withCredentials: true
      });
      const docsRaw = response.data?.documents || [];
      const newDocs = docsRaw.map((doc) => normalizeDoc(doc));
      
      // Vérifier si un nouveau document est arrivé
      if (uploadMessage && newDocs.length > initialDocsCount) {
        uploadMessage = '';
        uploadMessageType = '';
        stopPollingForNewDoc();
      }
      
      docs = newDocs;
    } catch (error) {
      // En cas d'erreur silencieuse, on ne fait rien
      console.error('Erreur lors du polling:', error);
    }
  }

  function stopPollingForNewDoc() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  // Fonction pour convertir les URLs en liens cliquables
  function formatMessageWithLinks(text) {
    if (!text) return text;
    
    // Regex pour détecter les URLs http/https
    const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
    
    // Remplacer les URLs par des balises <a> en nettoyant les caractères de ponctuation en fin d'URL
    return text.replace(urlRegex, (url) => {
      // Nettoyer les caractères de ponctuation en fin d'URL (., ), ,, ;, :, etc.)
      const cleanedUrl = url.replace(/[.,;:!?)]+$/, '');
      return `<a href="${cleanedUrl}" target="_blank" rel="noopener noreferrer" class="chat-link">${cleanedUrl}</a>`;
    });
  }

  // Fonction pour scroller vers le bas du chat
  let shouldAutoScroll = true;
  let previousHistoryLength = 0;

  function scrollToBottom() {
    if (chatHistoryContainer && shouldAutoScroll) {
      setTimeout(() => {
        chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
      }, 100);
    }
  }

  // Détecter si l'utilisateur scroll manuellement
  function handleChatScroll() {
    if (chatHistoryContainer) {
      const { scrollTop, scrollHeight, clientHeight } = chatHistoryContainer;
      // Si l'utilisateur est proche du bas (à 50px près), réactiver l'auto-scroll
      shouldAutoScroll = scrollHeight - scrollTop - clientHeight < 50;
    }
  }

  // Scroller seulement quand un nouveau message est ajouté
  $: if (chatHistory.length > previousHistoryLength) {
    previousHistoryLength = chatHistory.length;
    scrollToBottom();
  }

  // Nettoyer le polling quand le composant est détruit
  onDestroy(() => {
    stopPollingForNewDoc();
  });
</script>

<Securecsrf on:csrfTokenReceived={handleCsrfTokenReceived} />
<Navbar />

<div class="board-container">
  <div class="board-columns">
    <section class="board-card upload-card">
      <h2>Envoyer un document à n8n</h2>
      {#if uploadMessage}
        <div class="message message-{uploadMessageType}">
          {uploadMessage}
        </div>
      {/if}

      <div class="upload-body">
        <label class="file-label">
          <input bind:this={fileInput} type="file" accept="application/pdf" on:change={handleFileChange} />
          {#if selectedFile}
            <span>{selectedFile.name}</span>
          {:else}
            <span>Sélectionner un fichier PDF</span>
          {/if}
        </label>

        <button class="submit-btn" on:click={uploadDocument} disabled={uploadLoading}>
          {uploadLoading ? 'Transmission…' : 'Envoyer vers n8n'}
        </button>
      </div>

      <p class="helper-text">
        Le document sera analysé par n8n (extraction, agent IA, stockage Supabase).
      </p>
    </section>

    <section class="board-card chat-card">
      <h2>Chat avec l’agent IA</h2>
      <div bind:this={chatHistoryContainer} class="chat-history" on:scroll={handleChatScroll}>
        {#if chatHistory.length === 0}
          <div class="chat-placeholder">
            Posez une question après l'envoi d'un document pour interroger l'agent IA.
          </div>
        {:else}
          {#each chatHistory as item, index (index)}
            <div class="chat-message {item.from === 'Vous' ? 'from-user' : 'from-agent'}">
              <div class="sender">{item.from}</div>
              <p class="chat-text">{@html formatMessageWithLinks(item.text)}</p>
            </div>
          {/each}
        {/if}
      </div>

      <div class="chat-input">
        <textarea
          rows="2"
          bind:value={chatInput}
          placeholder="Posez votre question…"
          disabled={chatLoading}
        ></textarea>
        <button class="submit-btn" on:click={sendChatMessage} disabled={chatLoading}>
          {chatLoading ? 'Envoi…' : 'Envoyer'}
        </button>
      </div>
      {#if chatMessage}
        <div class="message message-error">{chatMessage}</div>
      {/if}
    </section>
  </div>

  <section class="board-card docs-card">
    <div class="docs-header">
      <h2>Documents récents</h2>
      <button class="refresh-btn" on:click={fetchLatestDocs} disabled={docsLoading}>
        {docsLoading ? '...' : 'Actualiser'}
      </button>
    </div>

    {#if docsError}
      <div class="message message-error">{docsError}</div>
    {/if}

    {#if docsLoading && docs.length === 0}
      <div class="docs-placeholder">Chargement des documents…</div>
    {:else if docs.length === 0}
      <div class="docs-placeholder">Aucun document reçu pour l'instant.</div>
    {:else}
      <ul class="docs-list">
        {#each docs as doc, index (doc.id || doc.receivedAt || doc.suggested_filename || index)}
          <li>
            <div class="doc-row">
              <div>
                <div class="doc-title">{doc.suggested_filename || doc.original_name || doc.fileName || doc.originalName || 'Document sans nom'}</div>
                <div class="doc-meta">
                  {doc.issuer || 'Source inconnue'} — {doc.category || 'catégorie'} — {doc.document_date ?? 'date inconnue'}
                </div>
                {#if doc.tldr}
                  <div class="doc-tldr">{doc.tldr}</div>
                {/if}
              </div>
              {#if doc.binary_reference}
                <a
                  class="doc-link"
                  href={doc.binary_reference?.publicUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ouvrir
                </a>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<style>
  .board-container {
    min-height: 100vh;
    padding: 40px 20px 120px;
    background: radial-gradient(circle at top, #152238, #05070e 55%);
  }

  .board-columns {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
    max-width: 1200px;
    margin: 0 auto 32px;
  }

  .board-card {
    background: rgba(10, 15, 30, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 18px;
    padding: 32px;
    box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5);
    flex: 1;
    min-width: 320px;
  }

  .upload-card {
    flex: 0.9;
  }

  .chat-card {
    flex: 1.1;
    display: flex;
    flex-direction: column;
  }

  .docs-card {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px;
  }

  h2 {
    margin: 0 0 24px;
    color: #f8fafc;
    font-size: 22px;
    letter-spacing: 0.04em;
    text-align: left;
  }

  .upload-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .file-label {
    border: 1px dashed rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    padding: 18px;
    text-align: center;
    color: #cbd5f5;
    cursor: pointer;
    transition: border-color 0.3s, color 0.3s;
  }

  .file-label input {
    display: none;
  }

  .file-label:hover {
    border-color: rgba(255, 255, 255, 0.6);
    color: #fff;
  }

  .helper-text {
    margin-top: 16px;
    font-size: 14px;
    color: rgba(226, 232, 240, 0.7);
    text-align: center;
  }

  .submit-btn {
    width: 100%;
    padding: 14px;
    border-radius: 11px;
    border: none;
    background: linear-gradient(135deg, #0ea5e9, #2563eb);
    color: #fff;
    font-weight: 600;
    font-size: 16px;
    cursor: pointer;
    transition: opacity 0.3s, transform 0.2s;
  }

  .submit-btn:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .message {
    padding: 14px 16px;
    border-radius: 10px;
    font-size: 14px;
    margin-bottom: 16px;
    text-align: center;
  }

  .message-success {
    background-color: rgba(34, 197, 94, 0.15);
    color: #dcfce7;
    border: 1px solid rgba(34, 197, 94, 0.35);
  }

  .message-error {
    background-color: rgba(239, 68, 68, 0.15);
    color: #fecaca;
    border: 1px solid rgba(239, 68, 68, 0.4);
  }

  .chat-history {
    flex: 1;
    overflow-y: auto;
    border-radius: 14px;
    background: rgba(6, 11, 25, 0.85);
    border: 1px solid rgba(148, 163, 184, 0.2);
    padding: 16px;
    margin-bottom: 16px;
    max-height: 380px;
  }

  .chat-placeholder,
  .docs-placeholder {
    text-align: center;
    font-style: italic;
    color: rgba(226, 232, 240, 0.6);
  }

  .chat-message {
    margin-bottom: 14px;
    padding: 12px 14px;
    border-radius: 12px;
  }

  .chat-message .sender {
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
    opacity: 0.7;
  }

  .chat-message p {
    margin: 0;
    line-height: 1.4;
  }

  .chat-text {
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .chat-text :global(.chat-link) {
    color: #60a5fa;
    text-decoration: underline;
    cursor: pointer;
    transition: color 0.2s;
  }

  .chat-text :global(.chat-link:hover) {
    color: #93c5fd;
  }

  .chat-message.from-user {
    background: rgba(14, 165, 233, 0.18);
    border: 1px solid rgba(14, 165, 233, 0.3);
    color: #bae6fd;
  }

  .chat-message.from-agent {
    background: rgba(99, 102, 241, 0.18);
    border: 1px solid rgba(99, 102, 241, 0.3);
    color: #e0e7ff;
  }

  .chat-input {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .chat-input textarea {
    width: 100%;
    padding: 12px;
    border-radius: 10px;
    border: 1px solid rgba(148, 163, 184, 0.3);
    background: rgba(11, 18, 34, 0.9);
    color: #f8fafc;
    resize: none;
    font-size: 14px;
  }

  .chat-input textarea:focus {
    outline: none;
    border-color: rgba(59, 130, 246, 0.8);
  }

  .docs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .refresh-btn {
    padding: 10px 16px;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.3);
    background: transparent;
    color: #e2e8f0;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .refresh-btn:hover:not(:disabled) {
    border-color: rgba(148, 163, 184, 0.6);
  }

  .docs-list {
    list-style: none;
    padding: 0;
    margin: 24px 0 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .docs-list li {
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.15);
  }

  .doc-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .doc-title {
    font-size: 16px;
    font-weight: 600;
    color: #f1f5f9;
  }

  .doc-meta {
    font-size: 13px;
    color: rgba(226, 232, 240, 0.7);
    margin-top: 4px;
  }

  .doc-tldr {
    margin-top: 12px;
    font-size: 14px;
    color: rgba(203, 213, 225, 0.9);
  }

  .doc-link {
    align-self: flex-start;
    padding: 10px 16px;
    border-radius: 8px;
    border: 1px solid rgba(59, 130, 246, 0.4);
    color: #93c5fd;
    text-decoration: none;
    transition: border-color 0.2s;
  }

  .doc-link:hover {
    border-color: rgba(59, 130, 246, 0.7);
  }

  @media (max-width: 991px) {
    .board-columns {
      flex-direction: column;
    }

    .board-card {
      min-width: auto;
    }
  }
</style>
