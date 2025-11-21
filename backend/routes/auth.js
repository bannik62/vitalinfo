import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.mjs';
import csrfProtection, { csrfTokenGenerator } from '../middleware/csrf.js';
import { authenticateToken } from '../middleware/auth.js';
import { loginRateLimit, resetLoginAttempts, getLoginAttemptsInfo, incrementLoginAttempts } from '../middleware/rateLimit.js';

const router = express.Router();
const JWT_SECRET = 'vitalinfo-jwt-secret-key-2024';

// Fonction de validation et sanitization
function validateAndSanitizeLogin(email, password) {
  // Sanitization: trim et normalisation
  const sanitizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const sanitizedPassword = typeof password === 'string' ? password.trim() : '';

  // Validation: champs requis
  if (!sanitizedEmail || !sanitizedPassword) {
    return { valid: false, error: 'Email et mot de passe requis' };
  }

  // Validation: longueur maximale
  if (sanitizedEmail.length > 255) {
    return { valid: false, error: 'Email trop long' };
  }

  if (sanitizedPassword.length > 128) {
    return { valid: false, error: 'Mot de passe trop long' };
  }

  // Validation: format email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitizedEmail)) {
    return { valid: false, error: 'Format d\'email invalide' };
  }

  return { 
    valid: true, 
    email: sanitizedEmail, 
    password: sanitizedPassword 
  };
}

// Route pour obtenir le token CSRF (génération sans vérification)
router.get('/csrf-token', csrfTokenGenerator, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Route de connexion avec protection contre le brute force
router.post('/login', csrfProtection, loginRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation et sanitization
    const validation = validateAndSanitizeLogin(email, password);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const sanitizedEmail = validation.email;
    const sanitizedPassword = validation.password;

    // Trouver l'utilisateur avec l'email sanitizé
    const user = await User.findOne({ where: { email: sanitizedEmail } });

    if (!user) {
      await incrementLoginAttempts(req);
      const attemptsInfo = await getLoginAttemptsInfo(req);
      return res.status(401).json({ 
        error: 'Email ou mot de passe incorrect',
        attemptsInfo 
      });
    }

    // Vérifier le mot de passe avec le password sanitizé
    const isValidPassword = await bcrypt.compare(sanitizedPassword, user.password);

    if (!isValidPassword) {
      await incrementLoginAttempts(req);
      const attemptsInfo = await getLoginAttemptsInfo(req);
      return res.status(401).json({ 
        error: 'Email ou mot de passe incorrect',
        attemptsInfo 
      });
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

    // Réinitialiser les tentatives après connexion réussie
    await resetLoginAttempts(req);

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

