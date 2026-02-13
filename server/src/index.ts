import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

const app = express();
const PORT = process.env.PORT || 3001;

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
