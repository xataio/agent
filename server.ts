/* eslint-disable no-process-env */
import { createServer } from 'http';
import next from 'next';

const port = process.env.PORT || 4001;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

void app.prepare().then(() => {
  createServer((req, res) => {
    void handle(req, res);
  }).listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
