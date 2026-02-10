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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
