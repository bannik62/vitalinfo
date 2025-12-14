import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import boardRoutes from './routes/board.js';
import agentRoutes from './routes/agent.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration pour récupérer la vraie IP du client (important avec Docker/reverse proxy)
app.set('trust proxy', true);

// Middleware
const DEFAULT_ALLOWED_ORIGINS = [
  // Dev
  'http://localhost:5173',
  // Prod
  'https://vitalinfo.site',
  'https://www.vitalinfo.site'
];
const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const allowedOrigins = envAllowedOrigins.length > 0 ? envAllowedOrigins : DEFAULT_ALLOWED_ORIGINS;

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans header Origin (ex: curl, health checks)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

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

