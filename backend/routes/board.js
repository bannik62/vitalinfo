import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import csrfProtection from '../middleware/csrf.js';

const router = express.Router();

// Route pour créer un message (protégée)
router.post('/', authenticateToken, csrfProtection, async (req, res) => {
  try {
    const { titre, description } = req.body;

    if (!titre || !description) {
      return res.status(400).json({ error: 'Titre et description requis' });
    }

    // TODO: Sauvegarder dans la base de données
    // Pour l'instant, on retourne juste un succès
    res.json({ 
      success: true,
      message: 'Message créé avec succès',
      data: {
        titre,
        description,
        userId: req.user.id
      }
    });
  } catch (error) {
    console.error('Erreur lors de la création du message:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

