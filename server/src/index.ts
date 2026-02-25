import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import authRoutes from './routes/auth';
import peopleRoutes from './routes/people';
import beltRoutes from './routes/belts';
import assignmentRoutes from './routes/assignments';
import templateRoutes from './routes/templates';
import timeoffRoutes from './routes/timeoff';
import facilityRoutes from './routes/facility';
import truckRoutes from './routes/trucks';
import spotRoutes from './routes/spots';
import routeRoutes from './routes/routes';
import briefingRoutes from './routes/briefing';
import inviteRoutes from './routes/invites';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/belts', beltRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/timeoff', timeoffRoutes);
app.use('/api/facility', facilityRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/spots', spotRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/briefing', briefingRoutes);
app.use('/api/invites', inviteRoutes);

// In production, serve the built client as static files
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../../client/build/client');
  app.use(express.static(clientBuildPath));

  // SPA fallback: any non-API, non-health route serves index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    }
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
