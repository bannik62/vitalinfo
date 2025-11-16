import csrf from 'csurf';

const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'strict'
  }
});

// Middleware pour générer le token sans le vérifier (pour la route GET /csrf-token)
// On utilise ignoreMethods pour ignorer la vérification sur GET
const csrfTokenGenerator = csrf({ 
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'strict'
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS']
});

export default csrfProtection;
export { csrfTokenGenerator };

