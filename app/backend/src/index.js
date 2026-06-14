import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

app.use(cors());
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'card-manager-api',
    environment: config.env
  });
});

app.use(express.static(frontendDistPath));

app.get('*', (_request, response) => {
  response.sendFile(path.join(frontendDistPath, 'index.html'), (error) => {
    if (error) {
      response.status(404).json({
        error: 'Frontend build not found. Run npm run build from the app folder.'
      });
    }
  });
});

app.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});
