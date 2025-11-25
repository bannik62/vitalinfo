<script>
  import { onDestroy, afterUpdate } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import axios from 'axios';
  import Securecsrf from '../security/module_csrf/Securecsrf.svelte';
  import Navbar from '../module_navbar/Navbar.svelte';

  let csrfToken = null;

  // Upload
  let selectedFile = null;
  let uploadedFileName = null; // Garder le nom du fichier après l'envoi
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
  
  // Speech-to-text
  let isListening = false;
  let recognition = null;
  let speechSupported = false;
  
  // Speech-to-text inverse (text-to-speech)
  let ttsSupported = false;
  let ttsEnabled = false;
  let speaking = false;
  let currentUtterance = null;
  let selectedVoice = null;

  // Documents
  let docs = [];
  let docsLoading = false;
  let docsError = '';
  let pollingInterval = null;
  let initialDocsCount = 0;
  
  // Erreurs
  let errorPollingInterval = null;
  let currentError = null;
  let errorModalOpen = false;
  let categoryGroups = [];
  let uncategorizedDocs = [];
  let selectedCategory = null;
  let categoryModalOpen = false;
  let editingDocId = null; // ID du document en cours d'édition
  let editingTitle = ''; // Titre en cours d'édition
  let savingDoc = false; // État de sauvegarde

  function handleCsrfTokenReceived(event) {
    csrfToken = event.detail;
    fetchLatestDocs();
    startErrorPolling();
    loadChatHistory();
  }

  function handleFileChange(event) {
    const files = event.target.files;
    
    // Limiter à 1 fichier maximum
    if (files.length > 1) {
      uploadMessage = 'Veuillez sélectionner un seul fichier PDF.';
      uploadMessageType = 'error';
      if (fileInput) {
        fileInput.value = '';
      }
      return;
    }
    
    const [file] = files;
    
    // Vérifier que c'est un PDF
    if (file && file.type !== 'application/pdf') {
      uploadMessage = 'Seuls les fichiers PDF sont autorisés.';
      uploadMessageType = 'error';
      if (fileInput) {
        fileInput.value = '';
      }
      selectedFile = null;
      return;
    }
    
    selectedFile = file;
    uploadedFileName = null; // Réinitialiser le nom du fichier uploadé
    uploadMessage = '';
    uploadMessageType = '';
  }

  function clearUploadForm() {
    selectedFile = null;
    uploadedFileName = null;
    uploadMessage = '';
    uploadMessageType = '';
    if (fileInput) {
      fileInput.value = '';
    }
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
      
      // Sauvegarder le nom du fichier avant de réinitialiser
      uploadedFileName = selectedFile.name;
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

  async function loadChatHistory() {
    try {
      const response = await axios.get('/api/agent/chat/history', {
        withCredentials: true
      });

      const history = response.data?.history || [];
      
      // Inverser l'ordre pour avoir les plus anciennes en haut
      const reversedHistory = [...history].reverse();
      
      // Transformer l'historique en format plat pour l'affichage
      const flatHistory = [];
      reversedHistory.forEach(conv => {
        flatHistory.push({
          id: conv.id,
          from: conv.userMessage.from,
          text: conv.userMessage.text,
          isUser: true
        });
        flatHistory.push({
          id: conv.id, // Même id pour lier la paire
          from: conv.agentMessage.from,
          text: conv.agentMessage.text,
          isUser: false
        });
      });
      
      chatHistory = flatHistory;
      scrollToBottom();
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
      // On continue même si l'historique ne charge pas
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

    const userMessage = { from: 'Vous', text: chatInput, isUser: true };
    chatHistory = [...chatHistory, userMessage];

    chatLoading = true;
    chatMessage = '';
    const messageToSend = chatInput;
    chatInput = '';

    try {
      const response = await axios.post(
        '/api/agent/chat',
        { message: messageToSend },
        {
          headers: { 'X-CSRF-Token': csrfToken },
          withCredentials: true,
          timeout: 60000 // 60 secondes pour laisser le temps à n8n de répondre
        }
      );

      const agentReply = {
        from: 'Agent IA',
        text: response.data?.answer || 'Réponse reçue.',
        isUser: false
      };
      chatHistory = [...chatHistory, agentReply];
      scrollToBottom();
      speakText(agentReply.text);
      
      // Ne pas recharger l'historique ici - les messages sont déjà affichés
      // L'historique sera rechargé au prochain démarrage de la page
    } catch (error) {
      chatMessage =
        error.response?.data?.error ||
        "Impossible de contacter l'agent pour le moment.";
      // En cas d'erreur, retirer le message utilisateur qui n'a pas été sauvegardé
      chatHistory = chatHistory.filter(msg => msg !== userMessage);
    } finally {
      chatLoading = false;
    }
  }

  // Initialisation de la reconnaissance vocale
  function initSpeechRecognition() {
    if (typeof window !== 'undefined') {
      try {
        // Vérification de la disponibilité de l'API de reconnaissance vocale
        let SpeechRecognitionConstructor = null;
        if ('SpeechRecognition' in window) {
          SpeechRecognitionConstructor = window.SpeechRecognition;
        } else if ('webkitSpeechRecognition' in window) {
          SpeechRecognitionConstructor = window['webkitSpeechRecognition'];
        }
        
        if (SpeechRecognitionConstructor) {
          // Utiliser une fonction pour contourner l'erreur TypeScript
          // @ts-expect-error - SpeechRecognition n'est pas dans les types TypeScript standard
          recognition = new SpeechRecognitionConstructor();
          speechSupported = true;
        }
        
        if (recognition) {
        recognition.lang = 'fr-FR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          isListening = true;
        };

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          chatInput = transcript.trim();
          // Envoi automatique après transcription
          setTimeout(() => {
            sendChatMessage();
          }, 100);
        };

        recognition.onerror = (event) => {
          console.error('Erreur de reconnaissance vocale:', event.error);
          isListening = false;
          if (event.error === 'no-speech') {
            chatMessage = 'Aucune parole détectée. Réessayez.';
          } else if (event.error === 'not-allowed') {
            chatMessage = 'Permission microphone refusée. Vérifiez les paramètres du navigateur.';
          } else if (event.error === 'network') {
            chatMessage = 'Erreur réseau : impossible de se connecter au service de transcription. Vérifiez votre connexion internet.';
          } else if (event.error === 'aborted') {
            chatMessage = 'Reconnaissance vocale interrompue.';
          } else {
            chatMessage = `Erreur de reconnaissance vocale : ${event.error}. Réessayez.`;
          }
        };

        recognition.onend = () => {
          isListening = false;
        };
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de la reconnaissance vocale:', error);
        speechSupported = false;
      }
    }
  }

  function startListening() {
    if (!speechSupported) {
      initSpeechRecognition();
    }
    
    if (!recognition) {
      chatMessage = 'Reconnaissance vocale non supportée sur ce navigateur.';
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    try {
      recognition.start();
    } catch (error) {
      console.error('Erreur au démarrage:', error);
      isListening = false;
    }
  }

  function stopListening() {
    if (recognition && isListening) {
      recognition.stop();
      isListening = false;
    }
  }

  function initSpeechSynthesis() {
    if (typeof window === 'undefined') {
      return;
    }
    const synth = window.speechSynthesis;
    if (!synth) {
      return;
    }

    ttsSupported = true;

    const loadVoices = () => {
      const voices = synth.getVoices();
      if (!voices || voices.length === 0) {
        return;
      }
      // Choisir prioritairement une voix française
      selectedVoice =
        voices.find((voice) => voice.lang?.toLowerCase().startsWith('fr')) ||
        voices.find((voice) => voice.lang?.toLowerCase().startsWith('en')) ||
        voices[0];
    };

    loadVoices();
    synth.onvoiceschanged = loadVoices;
  }

  function speakText(text) {
    if (!ttsEnabled || !ttsSupported || typeof window === 'undefined') {
      return;
    }

    const synth = window.speechSynthesis;
    if (!synth || !text?.trim()) {
      return;
    }

    stopSpeaking();

    currentUtterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
      currentUtterance.voice = selectedVoice;
    }
    currentUtterance.lang = selectedVoice?.lang || 'fr-FR';
    currentUtterance.rate = 1;
    currentUtterance.pitch = 1;

    currentUtterance.onstart = () => {
      speaking = true;
    };

    currentUtterance.onend = () => {
      speaking = false;
      currentUtterance = null;
    };

    currentUtterance.onerror = () => {
      speaking = false;
      currentUtterance = null;
      chatMessage = 'Erreur lors de la lecture audio.';
    };

    synth.speak(currentUtterance);
  }

  function stopSpeaking() {
    if (typeof window === 'undefined') {
      return;
    }

    const synth = window.speechSynthesis;
    if (synth && (synth.speaking || synth.pending)) {
      synth.cancel();
    }

    speaking = false;
    currentUtterance = null;
  }

  $: if (!ttsEnabled) {
    stopSpeaking();
  }

  // Initialiser au chargement
  if (typeof window !== 'undefined') {
    initSpeechRecognition();
    initSpeechSynthesis();
  }

  async function deleteConversation(conversationId) {
    if (!csrfToken) {
      chatMessage = 'Token CSRF indisponible. Rechargez la page.';
      return;
    }

    try {
      await axios.delete(`/api/agent/chat/${conversationId}`, {
        headers: { 'X-CSRF-Token': csrfToken },
        withCredentials: true
      });

      // Recharger l'historique après suppression
      await loadChatHistory();
    } catch (error) {
      chatMessage =
        error.response?.data?.error ||
        "Erreur lors de la suppression de la conversation.";
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
        uploadedFileName = null; // Réinitialiser le nom du fichier une fois le document reçu
        stopPollingForNewDoc();
      }
      
      docs = newDocs;
      refreshCategoryGroups();
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
        uploadedFileName = null; // Réinitialiser le nom du fichier une fois le document reçu
        stopPollingForNewDoc();
      }
      
      docs = newDocs;
      refreshCategoryGroups();
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

  async function checkForErrors() {
    try {
      const response = await axios.get('/api/agent/errors/latest', {
        withCredentials: true
      });
      
      if (response.data?.error) {
        currentError = response.data.error;
        errorModalOpen = true;
      }
    } catch (error) {
      // Erreur silencieuse, on ne fait rien
      console.error('Erreur lors de la vérification des erreurs:', error);
    }
  }

  function startErrorPolling() {
    // Vérifier toutes les 2 secondes
    errorPollingInterval = setInterval(() => {
      checkForErrors();
    }, 2000);
  }

  function stopErrorPolling() {
    if (errorPollingInterval) {
      clearInterval(errorPollingInterval);
      errorPollingInterval = null;
    }
  }

  function closeErrorModal() {
    errorModalOpen = false;
    currentError = null;
  }

  function refreshCategoryGroups() {
    const map = new SvelteMap();
    const others = [];

    docs.forEach((doc) => {
      const categoryName = doc.category?.trim();
      if (!categoryName) {
        others.push(doc);
        return;
      }

      if (!map.has(categoryName)) {
        map.set(categoryName, {
          name: categoryName,
          count: 0,
          lastDate: null,
          issuers: new SvelteMap()
        });
      }

      const categoryEntry = map.get(categoryName);
      categoryEntry.count += 1;

      if (doc.document_date) {
        const currentDate = new Date(doc.document_date);
        if (!categoryEntry.lastDate || currentDate > categoryEntry.lastDate) {
          categoryEntry.lastDate = currentDate;
        }
      }

      const issuerName = doc.issuer?.trim() || 'Émetteur inconnu';
      if (!categoryEntry.issuers.has(issuerName)) {
        categoryEntry.issuers.set(issuerName, []);
      }
      categoryEntry.issuers.get(issuerName).push(doc);
    });

    categoryGroups = Array.from(map.values())
      .map((entry) => ({
        name: entry.name,
        count: entry.count,
        lastDate: entry.lastDate ? entry.lastDate.toISOString().split('T')[0] : null,
        issuers: Array.from(entry.issuers.entries()).map(([issuerName, documents]) => ({
          name: issuerName,
          documents
        }))
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    uncategorizedDocs = others;

    if (categoryModalOpen && selectedCategory) {
      const updatedCategory = categoryGroups.find(
        (category) => category.name === selectedCategory.name
      );
      if (updatedCategory) {
        selectedCategory = updatedCategory;
      } else {
        closeCategoryModal();
      }
    }
  }

  function startEditDoc(doc) {
    editingDocId = doc.id;
    editingTitle =
      doc.suggested_filename || doc.original_name || doc.fileName || doc.originalName || '';
  }

  function cancelEditDoc() {
    editingDocId = null;
    editingTitle = '';
  }

  async function saveDocEdit(docId) {
    if (!editingTitle.trim()) {
      docsError = 'Le titre ne peut pas être vide.';
      return;
    }

    if (!csrfToken) {
      docsError = 'Token CSRF indisponible. Rechargez la page.';
      return;
    }

    savingDoc = true;
    docsError = '';

    try {
      await axios.put(
        `/api/docs/${docId}`,
        { suggested_filename: editingTitle.trim() },
        {
          headers: {
            'X-CSRF-Token': csrfToken,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );

      docs = docs.map((doc) =>
        doc.id === docId ? { ...doc, suggested_filename: editingTitle.trim() } : doc
      );
      refreshCategoryGroups();
      editingDocId = null;
      editingTitle = '';
    } catch (error) {
      docsError = error.response?.data?.error || 'Erreur lors de la sauvegarde.';
    } finally {
      savingDoc = false;
    }
  }

  function openCategoryModal(category) {
    selectedCategory = category;
    categoryModalOpen = true;
  }

  function closeCategoryModal() {
    categoryModalOpen = false;
    selectedCategory = null;
  }

  // Fonction pour convertir les URLs en segments sûrs (texte + liens)
  function buildMessageSegments(text) {
    if (!text) {
      return [];
    }

    const segments = [];
    const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
    const pushSegment = (segment) => {
      segments.push({ ...segment, key: `${segments.length}-${segment.type}` });
    };

    let lastIndex = 0;

    text.replace(urlRegex, (match, _, offset) => {
      if (offset > lastIndex) {
        pushSegment({ type: 'text', content: text.slice(lastIndex, offset) });
      }

      const cleanedUrl = match.replace(/[.,;:!?)]+$/, '');
      const trailing = match.slice(cleanedUrl.length);

      pushSegment({
        type: 'link',
        content: cleanedUrl,
        href: cleanedUrl
      });

      if (trailing) {
        pushSegment({ type: 'text', content: trailing });
      }

      lastIndex = offset + match.length;
      return match;
    });

    if (lastIndex < text.length) {
      pushSegment({ type: 'text', content: text.slice(lastIndex) });
    }

    return segments;
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
    stopErrorPolling();
    stopListening();
    stopSpeaking();
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
          {:else if uploadedFileName}
            <span>{uploadedFileName} (en cours de traitement…)</span>
          {:else}
            <span>Sélectionner un fichier PDF</span>
          {/if}
        </label>

        <div class="upload-actions">
          {#if selectedFile && !uploadLoading}
            <button class="cancel-btn" on:click={clearUploadForm} type="button">
              Annuler
            </button>
          {/if}
          <button class="submit-btn" on:click={uploadDocument} disabled={uploadLoading || !selectedFile}>
            {uploadLoading ? 'Transmission…' : 'Envoyer vers n8n'}
          </button>
        </div>
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
              <div class="message-header">
                <div class="sender">
                  {#if item.from === 'Vous'}
                    <span class="sender-icon">👤</span>
                  {:else}
                    <span class="sender-icon">🤖</span>
                  {/if}
                  {item.from}
                </div>
                {#if item.isUser && item.id}
                  <button 
                    class="delete-btn" 
                    on:click={() => deleteConversation(item.id)}
                    title="Supprimer cette conversation"
                  >
                    🗑️
                  </button>
                {/if}
              </div>
              <p class="chat-text">
                {#each buildMessageSegments(item.text) as segment (segment.key)}
                  {#if segment.type === 'link'}
                    <a
                      class="chat-link"
                      href={segment.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {segment.content}
                    </a>
                  {:else}
                    {segment.content}
                  {/if}
                {/each}
              </p>
            </div>
          {/each}
        {/if}
      </div>

      <div class="chat-audio-controls">
        <label class="audio-toggle">
          <input
            type="checkbox"
            bind:checked={ttsEnabled}
            disabled={!ttsSupported}
          />
          <span>
            {ttsSupported
              ? 'Lecture vocale automatique'
              : 'Lecture vocale indisponible sur ce navigateur'}
          </span>
        </label>
        <button
          type="button"
          class="stop-speech-btn"
          on:click={stopSpeaking}
          disabled={!speaking}
        >
          Couper la voix
        </button>
      </div>

      <div class="chat-input">
        <div class="chat-input-wrapper">
          <textarea
            rows="2"
            bind:value={chatInput}
            placeholder="Posez votre question…"
            disabled={chatLoading || isListening}
            on:keydown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
              }
            }}
          ></textarea>
          <button 
            class="micro-btn {isListening ? 'listening' : ''}" 
            on:click={startListening}
            disabled={chatLoading}
            title={isListening ? 'Arrêter l\'écoute' : 'Parler'}
            type="button"
          >
            {#if isListening}
              <span class="micro-icon pulse">🎤</span>
            {:else}
              <span class="micro-icon">🎤</span>
            {/if}
          </button>
        </div>
        <button class="submit-btn" on:click={sendChatMessage} disabled={chatLoading || isListening}>
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

    <div class="docs-overview">
      <div class="docs-summary">
        <div class="summary-value">{docs.length}</div>
        <div class="summary-label">Documents stockés</div>
      </div>
    </div>

    {#if docsLoading && docs.length === 0}
      <div class="docs-placeholder">Chargement des documents…</div>
    {:else if docs.length === 0}
      <div class="docs-placeholder">Aucun document reçu pour l'instant.</div>
    {:else}
      {#if categoryGroups.length > 0}
        <div class="categories-grid">
          {#each categoryGroups as category (category.name)}
            <div class="category-card">
              <div class="category-header">
                <h3>{category.name}</h3>
                <span class="category-count">
                  {category.count} document{category.count > 1 ? 's' : ''}
                </span>
              </div>
              {#if category.lastDate}
                <div class="category-last">Dernier : {category.lastDate}</div>
              {/if}
              <button class="category-btn" on:click={() => openCategoryModal(category)}>
                Voir les documents
              </button>
            </div>
          {/each}
        </div>
      {/if}

      {#if uncategorizedDocs.length > 0}
        <div class="uncategorized-section">
          <h3>Autres documents ({uncategorizedDocs.length})</h3>
          <ul class="docs-list">
            {#each uncategorizedDocs as doc, index (doc.id || doc.receivedAt || doc.suggested_filename || index)}
              <li>
                <div class="doc-row">
                  <div>
                    {#if editingDocId === doc.id}
                      <input
                        type="text"
                        bind:value={editingTitle}
                        class="doc-edit-input"
                        disabled={savingDoc}
                        on:keydown={(e) => {
                          if (e.key === 'Enter') {
                            saveDocEdit(doc.id);
                          } else if (e.key === 'Escape') {
                            cancelEditDoc();
                          }
                        }}
                      />
                    {:else}
                      <div class="doc-title">
                        {doc.suggested_filename || doc.original_name || doc.fileName || doc.originalName || 'Document sans nom'}
                      </div>
                    {/if}
                    <div class="doc-meta">
                      {doc.issuer || 'Source inconnue'} — {doc.category || 'catégorie'} — {doc.document_date ?? 'date inconnue'}
                    </div>
                    {#if doc.tldr}
                      <div class="doc-tldr">{doc.tldr}</div>
                    {/if}
                  </div>
                  <div class="doc-actions">
                    {#if editingDocId === doc.id}
                      <button
                        class="doc-btn doc-btn-save"
                        on:click={() => saveDocEdit(doc.id)}
                        disabled={savingDoc}
                      >
                        {savingDoc ? 'Sauvegarde...' : 'Sauvegarder'}
                      </button>
                      <button
                        class="doc-btn doc-btn-cancel"
                        on:click={cancelEditDoc}
                        disabled={savingDoc}
                      >
                        Annuler
                      </button>
                    {:else}
                      <button
                        class="doc-btn doc-btn-edit"
                        on:click={() => startEditDoc(doc)}
                      >
                        Éditer
                      </button>
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
                    {/if}
                  </div>
                </div>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    {/if}
  </section>
</div>

{#if categoryModalOpen && selectedCategory}
  <div class="modal-backdrop" on:click={closeCategoryModal}>
    <div class="modal-panel" on:click|stopPropagation>
      <button class="modal-close" on:click={closeCategoryModal}>×</button>
      <h3>{selectedCategory.name}</h3>
      <p class="modal-subtitle">
        {selectedCategory.count} document{selectedCategory.count > 1 ? 's' : ''}
      </p>

      <div class="modal-issuers">
        {#each selectedCategory.issuers as issuer (issuer.name)}
          <section class="issuer-section">
            <div class="issuer-header">
              <h4>{issuer.name}</h4>
              <span>{issuer.documents.length} document{issuer.documents.length > 1 ? 's' : ''}</span>
            </div>
            <ul class="docs-list">
              {#each issuer.documents as doc, index (doc.id || doc.receivedAt || doc.suggested_filename || index)}
                <li>
                  <div class="doc-row">
                    <div>
                      {#if editingDocId === doc.id}
                        <input
                          type="text"
                          bind:value={editingTitle}
                          class="doc-edit-input"
                          disabled={savingDoc}
                          on:keydown={(e) => {
                            if (e.key === 'Enter') {
                              saveDocEdit(doc.id);
                            } else if (e.key === 'Escape') {
                              cancelEditDoc();
                            }
                          }}
                        />
                      {:else}
                        <div class="doc-title">
                          {doc.suggested_filename || doc.original_name || doc.fileName || doc.originalName || 'Document sans nom'}
                        </div>
                      {/if}
                      <div class="doc-meta">
                        {doc.issuer || 'Source inconnue'} — {doc.document_date ?? 'date inconnue'}
                      </div>
                      {#if doc.tldr}
                        <div class="doc-tldr">{doc.tldr}</div>
                      {/if}
                    </div>
                    <div class="doc-actions">
                      {#if editingDocId === doc.id}
                        <button
                          class="doc-btn doc-btn-save"
                          on:click={() => saveDocEdit(doc.id)}
                          disabled={savingDoc}
                        >
                          {savingDoc ? 'Sauvegarde...' : 'Sauvegarder'}
                        </button>
                        <button
                          class="doc-btn doc-btn-cancel"
                          on:click={cancelEditDoc}
                          disabled={savingDoc}
                        >
                          Annuler
                        </button>
                      {:else}
                        <button
                          class="doc-btn doc-btn-edit"
                          on:click={() => startEditDoc(doc)}
                        >
                          Éditer
                        </button>
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
                      {/if}
                    </div>
                  </div>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>
    </div>
  </div>
{/if}

{#if errorModalOpen && currentError}
  <div class="modal-backdrop" on:click={closeErrorModal}>
    <div class="modal-panel error-modal" on:click|stopPropagation>
      <button class="modal-close" on:click={closeErrorModal}>×</button>
      <h3 style="color: #ff4444;">⚠️ Erreur de l'agent IA</h3>
      <div class="error-content">
        <p class="error-message"><strong>Erreur :</strong> {currentError.errorMessage || 'Erreur inconnue'}</p>
        {#if currentError.errorDescription}
          <p class="error-description">{currentError.errorDescription}</p>
        {/if}
        {#if currentError.n8nDetails?.nodeName}
          <p class="error-node"><strong>Nœud :</strong> {currentError.n8nDetails.nodeName}</p>
        {/if}
        {#if currentError.timestamp}
          <p class="error-time"><strong>Heure :</strong> {new Date(currentError.timestamp).toLocaleString('fr-FR')}</p>
        {/if}
      </div>
      <button class="error-close-btn" on:click={closeErrorModal}>Fermer</button>
    </div>
  </div>
{/if}

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
    font-size: clamp(18px, 2vw, 22px);
    letter-spacing: 0.04em;
    text-align: left;
  }

  .upload-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .upload-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .upload-actions .submit-btn {
    flex: 1;
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
    font-size: clamp(12px, 1.5vw, 14px);
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
    font-size: clamp(14px, 1.8vw, 16px);
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

  .cancel-btn {
    padding: 14px 20px;
    border-radius: 11px;
    border: 1px solid rgba(148, 163, 184, 0.4);
    background: transparent;
    color: #e2e8f0;
    font-weight: 600;
    font-size: clamp(14px, 1.8vw, 16px);
    cursor: pointer;
    transition: opacity 0.3s, transform 0.2s, border-color 0.2s;
  }

  .cancel-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
    border-color: rgba(148, 163, 184, 0.7);
    color: #fff;
  }

  .message {
    padding: 14px 16px;
    border-radius: 10px;
    font-size: clamp(12px, 1.5vw, 14px);
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
    overflow-x: hidden;
    border-radius: 14px;
    background: rgba(6, 11, 25, 0.85);
    border: 1px solid rgba(148, 163, 184, 0.2);
    padding: 16px;
    margin-bottom: 16px;
    max-height: 380px;
    max-width: 100%;
    overflow-wrap: break-word;
    word-break: break-word;
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
    max-width: 100%;
    min-width: 0;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
    position: relative;
    box-sizing: border-box;
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .chat-message .sender {
    text-transform: uppercase;
    font-size: clamp(10px, 1.2vw, 11px);
    letter-spacing: 0.08em;
    opacity: 0.7;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .sender-icon {
    font-size: clamp(12px, 1.4vw, 14px);
    line-height: 1;
    display: inline-block;
  }

  .delete-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: clamp(14px, 1.8vw, 16px);
    padding: 4px 8px;
    opacity: 0.6;
    transition: opacity 0.2s, transform 0.2s;
    line-height: 1;
  }

  .delete-btn:hover {
    opacity: 1;
    transform: scale(1.1);
  }

  .delete-btn:active {
    transform: scale(0.95);
  }

  .chat-message p {
    margin: 0;
    line-height: 1.4;
    min-width: 0;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
  }

  .chat-text {
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
    max-width: 100%;
    min-width: 0;
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
  
  .chat-audio-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 16px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.2);
  }

  .audio-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: clamp(11px, 1.4vw, 13px);
    color: #e2e8f0;
  }

  .audio-toggle input {
    width: 18px;
    height: 18px;
    accent-color: #3b82f6;
  }

  .stop-speech-btn {
    background: rgba(239, 68, 68, 0.18);
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: #fecaca;
    border-radius: 8px;
    padding: 8px 14px;
    cursor: pointer;
    font-size: clamp(10px, 1.3vw, 12px);
    transition: background 0.2s, transform 0.2s;
  }

  .stop-speech-btn:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.3);
    transform: scale(1.02);
  }

  .stop-speech-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .chat-input-wrapper {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  .chat-input textarea {
    flex: 1;
    padding: 12px;
    border-radius: 10px;
    border: 1px solid rgba(148, 163, 184, 0.3);
    background: rgba(11, 18, 34, 0.9);
    color: #f8fafc;
    resize: none;
    font-size: clamp(12px, 1.5vw, 14px);
  }

  .chat-input textarea:focus {
    outline: none;
    border-color: rgba(59, 130, 246, 0.8);
  }

  .micro-btn {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.4);
    border-radius: 10px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    height: 48px;
  }

  .micro-btn:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.3);
    border-color: rgba(59, 130, 246, 0.6);
    transform: scale(1.05);
  }

  .micro-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .micro-btn.listening {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.6);
    animation: pulse-glow 1.5s ease-in-out infinite;
  }

  .micro-icon {
    font-size: clamp(18px, 2vw, 22px);
    line-height: 1;
    display: block;
  }

  .micro-icon.pulse {
    animation: pulse-scale 1s ease-in-out infinite;
  }

  @keyframes pulse-scale {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
  }

  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
    }
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
    align-items: flex-start;
  }

  .doc-title {
    font-size: clamp(14px, 1.8vw, 16px);
    font-weight: 600;
    color: #f1f5f9;
  }

  .doc-meta {
    font-size: clamp(11px, 1.4vw, 13px);
    color: rgba(226, 232, 240, 0.7);
    margin-top: 4px;
  }

  .doc-tldr {
    margin-top: 12px;
    font-size: clamp(12px, 1.5vw, 14px);
    color: rgba(203, 213, 225, 0.9);
  }

  .doc-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-shrink: 0;
  }

  .doc-btn {
    padding: 10px 16px;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.3);
    background: transparent;
    color: #e2e8f0;
    cursor: pointer;
    font-size: clamp(12px, 1.5vw, 14px);
    transition: border-color 0.2s, color 0.2s;
  }

  .doc-btn:hover:not(:disabled) {
    border-color: rgba(148, 163, 184, 0.6);
    color: #fff;
  }

  .doc-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .doc-btn-edit {
    border-color: rgba(59, 130, 246, 0.4);
    color: #93c5fd;
  }

  .doc-btn-edit:hover:not(:disabled) {
    border-color: rgba(59, 130, 246, 0.7);
    color: #bfdbfe;
  }

  .doc-btn-save {
    border-color: rgba(34, 197, 94, 0.4);
    color: #86efac;
  }

  .doc-btn-save:hover:not(:disabled) {
    border-color: rgba(34, 197, 94, 0.7);
    color: #bbf7d0;
  }

  .doc-btn-cancel {
    border-color: rgba(239, 68, 68, 0.4);
    color: #fca5a5;
  }

  .doc-btn-cancel:hover:not(:disabled) {
    border-color: rgba(239, 68, 68, 0.7);
    color: #fecaca;
  }

  .doc-edit-input {
    width: 100%;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid rgba(59, 130, 246, 0.5);
    background: rgba(11, 18, 34, 0.9);
    color: #f8fafc;
    font-size: clamp(14px, 1.8vw, 16px);
    font-weight: 600;
  }

  .doc-edit-input:focus {
    outline: none;
    border-color: rgba(59, 130, 246, 0.8);
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

  .docs-overview {
    display: flex;
    gap: 24px;
    margin: 24px 0;
  }

  .docs-summary {
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 14px;
    padding: 16px 24px;
    text-align: center;
  }

  .summary-value {
    font-size: clamp(24px, 3vw, 32px);
    font-weight: 700;
    color: #f8fafc;
  }

  .summary-label {
    font-size: clamp(12px, 1.5vw, 14px);
    color: rgba(226, 232, 240, 0.7);
  }

  .categories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
  }

  .category-card {
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 16px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .category-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .category-header h3 {
    margin: 0;
    color: #f1f5f9;
    font-size: clamp(14px, 1.8vw, 16px);
  }

  .category-count {
    font-size: clamp(12px, 1.5vw, 14px);
    color: rgba(226, 232, 240, 0.7);
  }

  .category-last {
    font-size: clamp(11px, 1.4vw, 13px);
    color: rgba(226, 232, 240, 0.6);
  }

  .category-btn {
    padding: 10px 16px;
    border-radius: 8px;
    border: 1px solid rgba(59, 130, 246, 0.4);
    background: transparent;
    color: #93c5fd;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .category-btn:hover {
    border-color: rgba(59, 130, 246, 0.7);
  }

  .uncategorized-section {
    margin-top: 24px;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.72);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-panel {
    background: rgba(8, 15, 29, 0.98);
    border-radius: 20px;
    border: 1px solid rgba(59, 130, 246, 0.4);
    padding: 32px;
    width: min(900px, 90vw);
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
  }

  .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: clamp(20px, 2.5vw, 24px);
    cursor: pointer;
  }

  .modal-subtitle {
    margin-top: 4px;
    color: rgba(226, 232, 240, 0.7);
  }

  .modal-issuers {
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin-top: 24px;
  }

  .issuer-section {
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 14px;
    padding: 16px;
    background: rgba(15, 23, 42, 0.7);
  }

  .issuer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .issuer-header h4 {
    margin: 0;
    color: #f1f5f9;
  }

  @media (max-width: 991px) {
    .board-columns {
      flex-direction: column;
    }

    .board-card {
      min-width: auto;
    }
    /* Les font-size sont maintenant gérées par clamp(), plus besoin de media queries pour ça */
  }

  .error-modal {
    max-width: 600px;
  }

  .error-content {
    margin: 20px 0;
    line-height: 1.6;
  }

  .error-message {
    color: #ff6b6b;
    font-size: clamp(14px, 1.8vw, 16px);
    margin-bottom: 12px;
  }

  .error-description {
    color: rgba(226, 232, 240, 0.8);
    margin-bottom: 12px;
    padding: 12px;
    background: rgba(255, 68, 68, 0.1);
    border-radius: 8px;
    border-left: 3px solid #ff4444;
  }

  .error-node,
  .error-time {
    color: rgba(226, 232, 240, 0.7);
    font-size: clamp(12px, 1.5vw, 14px);
    margin-top: 8px;
  }

  .error-close-btn {
    margin-top: 20px;
    padding: 10px 24px;
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.4);
    border-radius: 8px;
    color: #93c5fd;
    cursor: pointer;
    transition: all 0.2s;
  }

  .error-close-btn:hover {
    background: rgba(59, 130, 246, 0.3);
    border-color: rgba(59, 130, 246, 0.6);
  }
</style>
