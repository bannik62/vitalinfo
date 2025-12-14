import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';
import { authenticateToken } from '../middleware/auth.js';
import csrfProtection from '../middleware/csrf.js';
import ChatConversation from '../models/ChatConversation.mjs';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_SIZE) || 20 * 1024 * 1024
  }
});

const N8N_UPLOAD_URL =
  process.env.N8N_UPLOAD_URL ||
  'https://n8n.codeurbase.fr/webhook/agent/upload';

const N8N_CHAT_URL =
  process.env.N8N_CHAT_URL ||
  'https://n8n.codeurbase.fr/webhook/chat';
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || '';

const docResultsStore = new Map();
const MAX_RESULTS_PER_USER = 25;
const errorStore = new Map(); // Stockage temporaire des erreurs par userId

const assertN8NSecret = (req, res, next) => {
  if (!N8N_WEBHOOK_SECRET) {
    return res
      .status(500)
      .json({ error: 'Le secret N8N_WEBHOOK_SECRET est manquant côté serveur.' });
  }
  const headerSecret = req.headers['x-n8n-secret'];
  console.log('🔐 Secret reçu dans header:', JSON.stringify(headerSecret));
  console.log('🔐 Secret attendu:', JSON.stringify(N8N_WEBHOOK_SECRET));
  console.log('🔐 Correspondance:', headerSecret === N8N_WEBHOOK_SECRET);
  if (!headerSecret || headerSecret !== N8N_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Accès non autorisé.' });
  }
  next();
};

const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res
          .status(400)
          .json({ error: 'Le fichier dépasse la taille maximale autorisée.' });
      }
      return res.status(400).json({ error: err.message || 'Upload invalide.' });
    }
    next();
  });
};

router.post(
  '/docs/upload',
  authenticateToken,
  csrfProtection,
  handleUpload,
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu.' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Seuls les fichiers PDF sont autorisés.' });
    }

    // Vérifier que le nom du fichier est présent
    if (!req.file.originalname) {
      console.error('❌ Nom de fichier manquant:', req.file);
      return res.status(400).json({ error: 'Nom de fichier manquant.' });
    }

    try {
    const formData = new FormData();
      
      // n8n Form Trigger - essayer avec le buffer directement
      // Certaines versions de n8n préfèrent le buffer au stream
    formData.append('doc', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    
    // Envoyer le userId à n8n pour qu'il puisse le renvoyer avec les résultats
    const userId = req.user?.id || 'global';
    formData.append('userId', userId);
    formData.append('userEmail', req.user?.email || '');
      // Envoyer explicitement le nom du fichier pour que n8n puisse le renvoyer
      // n8n peut utiliser ces champs pour remplir original_name dans sa réponse
      formData.append('fileName', req.file.originalname);
      formData.append('originalName', req.file.originalname);
      formData.append('original_filename', req.file.originalname); // Variante supplémentaire

      console.log('📤 Envoi fichier à n8n:', {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimetype: req.file.mimetype,
        userId: userId,
        url: N8N_UPLOAD_URL,
        bufferLength: req.file.buffer?.length,
        hasBuffer: !!req.file.buffer
      });

      const headers = formData.getHeaders();
      console.log('📋 Headers FormData:', JSON.stringify(headers, null, 2));

      const response = await axios.post(N8N_UPLOAD_URL, formData, {
        headers: headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30_000
      });
      
      console.log('✅ Réponse n8n:', response.status, response.data);

      return res.status(202).json({
        success: true,
        message: 'Document transmis à n8n pour traitement.'
      });
    } catch (error) {
      console.error('❌ Erreur lors de la transmission à n8n:');
      console.error('  - Message:', error.message);
      console.error('  - Code:', error.code);
      console.error('  - Status:', error.response?.status);
      console.error('  - Response data:', error.response?.data);
      console.error('  - URL:', N8N_UPLOAD_URL);
      
      // Gérer différents types d'erreurs
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        console.error('❌ Erreur de connexion: n8n est inaccessible');
        return res.status(502).json({
          error: "Impossible de se connecter à n8n. Vérifiez que le service est accessible."
        });
      }
      
      if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        console.error('❌ Timeout: n8n ne répond pas dans les temps');
        return res.status(502).json({
          error: "Timeout: n8n ne répond pas dans les temps impartis."
        });
      }
      
      if (error.response) {
        // Erreur HTTP avec réponse
        const status = error.response.status;
        const data = error.response.data;
        
        if (status >= 500) {
          return res.status(502).json({
            error: `Erreur serveur n8n (${status}). Veuillez réessayer plus tard.`
          });
        }
        
        if (status === 400 || status === 422) {
          return res.status(400).json({
            error: data?.error || data?.message || "Format de requête invalide pour n8n."
          });
        }
        
        return res.status(502).json({
          error: data?.error || data?.message || `Erreur n8n (${status})`
        });
      }
      
      // Erreur sans réponse (réseau, etc.)
      return res.status(502).json({
        error: "Erreur de communication avec n8n. Veuillez réessayer."
      });
    }
  }
);

router.post(
  '/agent/chat',
  authenticateToken,
  csrfProtection,
  async (req, res) => {
    const { message } = req.body || {};

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Merci de saisir une question.' });
    }

    if (!N8N_CHAT_URL) {
      return res.status(200).json({
        answer:
          "Le canal de discussion avec l'agent n'est pas encore configuré côté serveur."
      });
    }

    try {
      const response = await axios.post(
        N8N_CHAT_URL,
        {
          message,
          user: {
            id: req.user?.id,
            email: req.user?.email
          }
        },
        {
          timeout: 60_000 // 60 secondes pour laisser le temps à n8n de répondre
        }
      );

      // Log la réponse complète de n8n pour voir ce qui est renvoyé
      console.log('📊 Réponse complète de n8n:', JSON.stringify(response.data, null, 2));

      // Accepter soit 'answer' soit 'output' de n8n
      const agentAnswer = response.data?.answer || response.data?.output;

      // Sauvegarder la conversation en base de données
      try {
        await ChatConversation.create({
          user_id: req.user?.id,
          user_message: message.trim(),
          agent_response: agentAnswer || "Réponse reçue de l'agent IA."
        });
        console.log('✅ Conversation sauvegardée en base');
      } catch (dbError) {
        console.error('❌ Erreur lors de la sauvegarde de la conversation:', dbError.message);
        // On continue même si la sauvegarde échoue, on retourne quand même la réponse
      }

      return res.json({
        answer: agentAnswer || "Réponse reçue de l'agent IA."
      });
    } catch (error) {
      console.error('Erreur lors de la requête chat n8n:', error.message);
      console.error('Status code:', error.response?.status);
      console.error('Response data:', error.response?.data);
      console.error('Response headers:', error.response?.headers);
      return res.status(502).json({
        error:
          "L'agent IA est indisponible. Veuillez réessayer dans quelques instants."
      });
    }
  }
);

router.post('/docs/result', assertN8NSecret, (req, res) => {
  console.log('🔵 Route /docs/result appelée');
  console.log('🔵 Headers reçus:', JSON.stringify(req.headers, null, 2));
  console.log('🔵 Body brut:', req.body);
  console.log('🔵 Type de body:', typeof req.body);
  console.log('🔵 Body stringifié:', JSON.stringify(req.body, null, 2));
  
  const payload = req.body;
  if (!payload || Object.keys(payload).length === 0) {
    console.log('❌ Payload vide ou invalide');
    return res.status(400).json({ error: 'Payload vide reçu.' });
  }

  const userId = payload.userId || 'global';
  console.log('📥 Document reçu de n8n pour userId:', userId);
  console.log('📄 Données reçues:', JSON.stringify(payload, null, 2));
  
  const previous = docResultsStore.get(userId) || [];
  const newEntry = {
    ...payload,
    receivedAt: new Date().toISOString()
  };

  const updated = [newEntry, ...previous].slice(0, MAX_RESULTS_PER_USER);
  docResultsStore.set(userId, updated);
  console.log('✅ Document stocké. Total pour userId:', userId, '=', updated.length);

  return res.json({ success: true });
});

router.post('/errors', assertN8NSecret, (req, res) => {
  console.log('🔴 Route /errors appelée');
  console.log('🔴 Erreur reçue de n8n:', JSON.stringify(req.body, null, 2));
  
  const errorData = req.body;
  if (!errorData || Object.keys(errorData).length === 0) {
    console.log('❌ Payload d\'erreur vide ou invalide');
    return res.status(400).json({ error: 'Payload d\'erreur vide reçu.' });
  }

  const userId = errorData.userId || 'global';
  const timestamp = new Date().toISOString();
  
  // Log l'erreur
  console.error('❌ ERREUR AGENT IA:', {
    timestamp,
    errorMessage: errorData.errorMessage,
    errorDescription: errorData.errorDescription,
    nodeName: errorData.n8nDetails?.nodeName,
    userId
  });

  // Stocker l'erreur temporairement (garder seulement les 5 dernières par user)
  const userErrors = errorStore.get(userId) || [];
  const newError = {
    ...errorData,
    timestamp,
    id: Date.now() // ID simple pour identification
  };
  const updatedErrors = [newError, ...userErrors].slice(0, 5);
  errorStore.set(userId, updatedErrors);
  
  return res.json({ success: true, message: 'Erreur enregistrée' });
});

// Nouveau endpoint pour le Error Trigger n8n
router.post('/report_n8n', assertN8NSecret, (req, res) => {
  console.log('🔴 Route /report_n8n appelée');
  console.log('🔴 Payload brut:', JSON.stringify(req.body, null, 2));

  const payload = req.body;
  if (!Array.isArray(payload) || payload.length === 0) {
    return res.status(400).json({ error: 'Payload attendu: tableau non vide.' });
  }

  let storedCount = 0;
  payload.forEach((entry, index) => {
    const execution = entry?.execution || {};
    const workflow = entry?.workflow || {};
    const errorInfo = execution.error || {};

    const userId = entry?.userId || 'global';
    const timestamp = new Date().toISOString();

    const newError = {
      errorMessage: errorInfo.message || 'Erreur n8n reçue',
      errorDescription: workflow.name ? `Workflow: ${workflow.name}` : undefined,
      n8nDetails: {
        nodeName: execution.lastNodeExecuted || workflow.lastNodeExecuted,
        workflowName: workflow.name,
        executionId: execution.id
      },
      timestamp,
      id: Date.now() + index // ID simple
    };

    const userErrors = errorStore.get(userId) || [];
    const updatedErrors = [newError, ...userErrors].slice(0, 5);
    errorStore.set(userId, updatedErrors);
    storedCount += 1;

    console.error('❌ ERREUR N8N REPORT:', {
      userId,
      ...newError
    });
  });

  return res.json({ success: true, stored: storedCount });
});

router.get('/agent/errors/latest', authenticateToken, (req, res) => {
  const userId = req.user?.id || 'global';
  const errors = errorStore.get(userId) || [];
  
  // Retourner la première erreur (la plus récente) et la supprimer du store
  if (errors.length > 0) {
    const latestError = errors[0];
    // Supprimer l'erreur après l'avoir retournée (pour ne l'afficher qu'une fois)
    errorStore.set(userId, errors.slice(1));
    return res.json({ error: latestError });
  }
  
  return res.json({ error: null });
});

// Route pour récupérer l'historique des conversations (10 dernières)
router.get('/agent/chat/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Utilisateur non identifié.' });
    }

    const conversations = await ChatConversation.findAll({
      where: {
        user_id: userId
      },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Transformer les données pour le frontend
    const history = conversations.map(conv => ({
      id: conv.id,
      userMessage: {
        from: 'Vous',
        text: conv.user_message
      },
      agentMessage: {
        from: 'Agent IA',
        text: conv.agent_response
      },
      createdAt: conv.createdAt
    }));

    return res.json({ history });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'historique:', error.message);
    return res.status(500).json({ 
      error: 'Erreur lors de la récupération de l\'historique.' 
    });
  }
});

// Route pour supprimer une conversation
router.delete('/agent/chat/:id', authenticateToken, csrfProtection, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id) {
      return res.status(400).json({ error: 'ID de conversation requis.' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Utilisateur non identifié.' });
    }

    // Vérifier que la conversation appartient à l'utilisateur
    const conversation = await ChatConversation.findOne({
      where: {
        id: id,
        user_id: userId
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation non trouvée ou accès non autorisé.' });
    }

    // Supprimer la conversation (la paire question/réponse)
    await ChatConversation.destroy({
      where: {
        id: id,
        user_id: userId
      }
    });

    console.log('✅ Conversation supprimée:', id);
    
    return res.json({ 
      success: true,
      message: 'Conversation supprimée avec succès.'
    });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de la conversation:', error.message);
    return res.status(500).json({ 
      error: 'Erreur lors de la suppression de la conversation.' 
    });
  }
});

router.get('/docs/latest', authenticateToken, async (req, res) => {
  try {
    // Récupérer les documents depuis Supabase au lieu du Map en mémoire
    const supabaseUrl = process.env.SUPABASE_URL || 'https://zuvzpcfrbheqeqbiottv.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseKey) {
      console.warn('⚠️ SUPABASE_ANON_KEY non configuré, utilisation du Map en mémoire');
      const userId = 'global';
      const documents = docResultsStore.get(userId) || [];
      return res.json({ documents });
    }

    // Récupérer les documents depuis Supabase, triés par date de création décroissante
    const response = await axios.get(
      `${supabaseUrl}/rest/v1/documents_metadata`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          select: '*',
          order: 'created_at.desc',
          limit: 25
        }
      }
    );

    const documents = response.data || [];
    console.log('📚 Documents récupérés depuis Supabase:', documents.length);
    
    return res.json({ documents });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération depuis Supabase:', error.message);
    // Fallback sur le Map en mémoire en cas d'erreur
    const userId = 'global';
    const documents = docResultsStore.get(userId) || [];
    return res.json({ documents });
  }
});

router.put('/docs/:id', authenticateToken, csrfProtection, async (req, res) => {
  try {
    const { id } = req.params;
    const { suggested_filename, original_name } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID du document requis.' });
    }

    // Récupérer les credentials Supabase
    const supabaseUrl = process.env.SUPABASE_URL || 'https://zuvzpcfrbheqeqbiottv.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseKey) {
      return res.status(500).json({ error: 'Configuration Supabase manquante.' });
    }

    // Préparer les données à mettre à jour
    const updateData = {};
    if (suggested_filename !== undefined) {
      updateData.suggested_filename = suggested_filename;
    }
    if (original_name !== undefined) {
      updateData.original_name = original_name;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour.' });
    }

    // Mettre à jour le document dans Supabase
    const response = await axios.patch(
      `${supabaseUrl}/rest/v1/documents_metadata?id=eq.${id}`,
      updateData,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      }
    );

    console.log('✅ Document mis à jour dans Supabase:', id);
    
    return res.json({ 
      success: true, 
      document: response.data?.[0] || response.data 
    });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du document:', error.message);
    console.error('Response:', error.response?.data);
    return res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du document.' 
    });
  }
});

export default router;

