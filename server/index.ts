import express from 'express';
import { createServer } from 'http';
import { router } from './routes';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

const app = express();
const server = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(router);

const PORT = parseInt(process.env.PORT || '5000');

async function setupVite() {
  const indexPath = path.resolve(process.cwd(), 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.log('No index.html found - running as API-only server');
    app.get('*', (req, res) => {
      res.json({
        message: 'Semantic Change Alert API',
        version: '1.0.0',
        docs: '/api/health',
        status: 'running'
      });
    });
    return;
  }

  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: 'custom',
  });

  app.use(vite.middlewares);

  app.get('*', async (req, res, next) => {
    const url = req.originalUrl;

    if (url.startsWith('/api')) {
      return next();
    }

    try {
      let template = fs.readFileSync(indexPath, 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

async function serveStatic() {
  const distPath = path.resolve(process.cwd(), 'dist', 'public');
  const indexPath = path.join(distPath, 'index.html');

  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
  }

  app.get('*', (_req, res, next) => {
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
}

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    await serveStatic();
  } else {
    await setupVite();
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
