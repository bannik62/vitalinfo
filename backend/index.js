import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import boardRoutes from './routes/board.js';
import agentRoutes from './routes/agent.js';
import securityRoutes from './routes/security.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Récupérer la vraie IP derrière un proxy/reverse proxy
app.set('trust proxy', true);

// CORS : accepte localhost (dev) et domaine prod par défaut,
// et permet d'ajouter d'autres origines via ALLOWED_ORIGINS (séparées par des virgules).
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://vitalinfo.site',
  'https://www.vitalinfo.site'
];
const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
const allowedOrigins = envAllowedOrigins.length > 0 ? envAllowedOrigins : DEFAULT_ALLOWED_ORIGINS;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // requêtes sans Origin (curl, healthcheck)
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/board', boardRoutes);
app.use('/api', agentRoutes);
app.use('/api/security', securityRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Route par défaut
app.get('/', (req, res) => {
  res.json({ message: 'VitalInfo Backend API' });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});

