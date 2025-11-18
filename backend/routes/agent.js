import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';
import { authenticateToken } from '../middleware/auth.js';
import csrfProtection from '../middleware/csrf.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_SIZE) || 20 * 1024 * 1024
  }
});

const N8N_UPLOAD_URL =
  process.env.N8N_UPLOAD_URL ||
  'https://n8n.codeurbase.fr/form/45380310-7a67-46af-a865-708ff84eb2af';

const N8N_CHAT_URL =
  process.env.N8N_CHAT_URL ||
  'https://n8n.codeurbase.fr/webhook/chat';
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || '';

const docResultsStore = new Map();
const MAX_RESULTS_PER_USER = 25;

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
      
      // n8n Form Trigger attend les fichiers en multipart/form-data
      // Utiliser le buffer directement avec le nom de fichier pour que n8n puisse l'extraire
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
          timeout: 30_000
        }
      );

      // Accepter soit 'answer' soit 'output' de n8n
      const agentAnswer = response.data?.answer || response.data?.output;

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

router.get('/docs/latest', authenticateToken, (req, res) => {
  // Utiliser toujours 'global' pour correspondre avec les données envoyées par n8n
  const userId = 'global';
  console.log('📤 Récupération documents pour userId:', userId);
  const documents = docResultsStore.get(userId) || [];
  console.log('📚 Documents trouvés:', documents.length);
  return res.json({ documents });
});

export default router;

