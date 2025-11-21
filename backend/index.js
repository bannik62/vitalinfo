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
app.use(cors({
  origin: 'http://localhost:5173',
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

