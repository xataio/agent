/* eslint-disable no-process-env */
import { createServer } from 'http';
import next from 'next';
import { auth } from './src/auth';
import { setUserIdProvider } from './src/lib/db/db';

const port = process.env.PORT || 4001;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

void app.prepare().then(async () => {
  // Initialize the user ID provider to use auth
  setUserIdProvider(async () => {
    const session = await auth();
    return session?.user?.id;
  });

  createServer((req, res) => {
    void handle(req, res);
  }).listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
