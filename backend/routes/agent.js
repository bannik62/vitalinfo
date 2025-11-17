import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
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

const N8N_CHAT_URL = process.env.N8N_CHAT_URL || '';
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
  if (!headerSecret || headerSecret !== N8N_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Accès non autorisé.' });
  }
  next();
};

const handleUpload = (req, res, next) => {
  const middleware = upload.single('file');
  middleware(req, res, (err) => {
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

    const formData = new FormData();
    formData.append('doc', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    try {
      await axios.post(N8N_UPLOAD_URL, formData, {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30_000
      });

      return res.status(202).json({
        success: true,
        message: 'Document transmis à n8n pour traitement.'
      });
    } catch (error) {
      console.error(
        'Erreur lors de la transmission à n8n:',
        error.message,
        'status:',
        error.response?.status,
        'data:',
        error.response?.data
      );
      return res.status(502).json({
        error: "Impossible de transmettre le document à n8n pour le moment."
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

      return res.json({
        answer: response.data?.answer || 'Réponse reçue de l’agent IA.'
      });
    } catch (error) {
      console.error('Erreur lors de la requête chat n8n:', error.message);
      return res.status(502).json({
        error:
          "L'agent IA est indisponible. Veuillez réessayer dans quelques instants."
      });
    }
  }
);

router.post('/docs/result', assertN8NSecret, (req, res) => {
  const payload = req.body;
  if (!payload || Object.keys(payload).length === 0) {
    return res.status(400).json({ error: 'Payload vide reçu.' });
  }

  const userId = payload.userId || 'global';
  const previous = docResultsStore.get(userId) || [];
  const newEntry = {
    ...payload,
    receivedAt: new Date().toISOString()
  };

  const updated = [newEntry, ...previous].slice(0, MAX_RESULTS_PER_USER);
  docResultsStore.set(userId, updated);

  return res.json({ success: true });
});

router.get('/docs/latest', authenticateToken, async (req, res) => {
  const userId = req.user?.id || 'global';
  const docs = docResultsStore.get(userId) || [];
  return res.json({ documents: docs });
});

export default router;

