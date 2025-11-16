import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.mjs';
import csrfProtection, { csrfTokenGenerator } from '../middleware/csrf.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = 'vitalinfo-jwt-secret-key-2024';

// Route pour obtenir le token CSRF (génération sans vérification)
router.get('/csrf-token', csrfTokenGenerator, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Route de connexion
router.post('/login', csrfProtection, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Définir le cookie HTTP-only
    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000 // 1 heure
    });

    res.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route de déconnexion
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Déconnexion réussie' });
});

// Route pour vérifier l'authentification
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ 
    authenticated: true,
    user: req.user
  });
});

export default router;

