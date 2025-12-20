// Exemple d'utilisation dans routes/auth.js

import { logSecurityEvent, getClientIP } from '../utils/securityLogger.js';

// Dans la route de login
router.post('/login', csrfProtection, loginRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    const validation = validateAndSanitizeLogin(email, password);
    
    if (!validation.valid) {
      // 🔍 Log tentative avec données invalides
      await logSecurityEvent({
        type: 'LOGIN_ATTEMPT_INVALID_DATA',
        severity: 'INFO',
        ip: getClientIP(req),
        email: email?.substring(0, 255),
        reason: validation.error,
        userAgent: req.headers['user-agent'],
        path: req.path
      });
      
      return res.status(400).json({ error: validation.error });
    }

    const sanitizedEmail = validation.email;
    const sanitizedPassword = validation.password;
    const user = await User.findOne({ where: { email: sanitizedEmail } });

    if (!user) {
      await incrementLoginAttempts(req);
      
      // 🔍 Log tentative sur compte inexistant
      await logSecurityEvent({
        type: 'LOGIN_FAILED',
        severity: 'WARNING',
        ip: getClientIP(req),
        email: sanitizedEmail,
        reason: 'USER_NOT_FOUND',
        userAgent: req.headers['user-agent'],
        path: req.path,
        metadata: {
          attemptsInfo: await getLoginAttemptsInfo(req)
        }
      });
      
      return res.status(401).json({ 
        error: 'Email ou mot de passe incorrect',
        attemptsInfo: await getLoginAttemptsInfo(req)
      });
    }

    const isValidPassword = await bcrypt.compare(sanitizedPassword, user.password);

    if (!isValidPassword) {
      await incrementLoginAttempts(req);
      
      // 🔍 Log mauvais mot de passe
      await logSecurityEvent({
        type: 'LOGIN_FAILED',
        severity: 'WARNING',
        ip: getClientIP(req),
        email: sanitizedEmail,
        reason: 'INVALID_PASSWORD',
        userAgent: req.headers['user-agent'],
        path: req.path,
        metadata: {
          userId: user.id,
          attemptsInfo: await getLoginAttemptsInfo(req)
        }
      });
      
      return res.status(401).json({ 
        error: 'Email ou mot de passe incorrect',
        attemptsInfo: await getLoginAttemptsInfo(req)
      });
    }

    // ✅ Connexion réussie
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000
    });

    await resetLoginAttempts(req);

    // 🔍 Log connexion réussie
    await logSecurityEvent({
      type: 'LOGIN_SUCCESS',
      severity: 'INFO',
      ip: getClientIP(req),
      email: sanitizedEmail,
      userAgent: req.headers['user-agent'],
      path: req.path,
      metadata: {
        userId: user.id,
        role: user.role
      }
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
    // 🔍 Log erreur serveur
    await logSecurityEvent({
      type: 'LOGIN_ERROR',
      severity: 'CRITICAL',
      ip: getClientIP(req),
      reason: error.message,
      path: req.path,
      metadata: {
        stack: error.stack
      }
    });
    
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

