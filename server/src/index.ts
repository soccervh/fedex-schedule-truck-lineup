import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import peopleRoutes from './routes/people';
import beltRoutes from './routes/belts';
import assignmentRoutes from './routes/assignments';

dotenv.config();

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
