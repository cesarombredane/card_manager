import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import { HttpError } from './http.js';
import { artistsRouter } from './routes/artists.js';
import { cardsRouter } from './routes/cards.js';
import { cardConceptsRouter } from './routes/cardConcepts.js';
import { cardPrintsRouter } from './routes/cardPrints.js';
import { compareRouter } from './routes/compare.js';
import { healthRouter } from './routes/health.js';
import { languagesRouter } from './routes/languages.js';
import { pokemonRouter } from './routes/pokemon.js';
import { printVariantsRouter } from './routes/printVariants.js';
import { searchRouter } from './routes/search.js';
import { seriesRouter } from './routes/series.js';
import { setsRouter } from './routes/sets.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/search', searchRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/card-concepts', cardConceptsRouter);
app.use('/api/card-prints', cardPrintsRouter);
app.use('/api/print-variants', printVariantsRouter);
app.use('/api/pokemon', pokemonRouter);
app.use('/api/sets', setsRouter);
app.use('/api/series', seriesRouter);
app.use('/api/languages', languagesRouter);
app.use('/api/artists', artistsRouter);
app.use('/api/compare', compareRouter);

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

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: error.message
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: 'Internal server error'
  });
};

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});
