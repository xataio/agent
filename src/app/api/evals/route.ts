import fs from 'fs/promises';
import { NextRequest } from 'next/server';
import path from 'path';
import { z } from 'zod';
import { evalResponseSchema } from '~/evals/api-schemas';
import { env } from '~/lib/env/server';

export async function GET(request: NextRequest) {
  try {
    if (env.EVAL !== 'true') {
      throw new Error('EVAL environment variable must be set to 1');
    }
    const searchParams = request.nextUrl.searchParams;

    const folderParam = z.string().min(1).safeParse(searchParams.get('folder'));

    if (!folderParam.success) {
      return Response.json({ error: 'Invalid folder parameter' }, { status: 400 });
    }

    const folderPath = folderParam.data;

    const files = await fs.readdir(folderPath);

    const filesWithContents = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(folderPath, file);
        const contents = await fs.readFile(filePath, 'utf-8');
        return {
          fileName: path.basename(file),
          contents
        };
      })
    );

    filesWithContents.sort((a, b) => {
      if (a.fileName === 'human.txt') {
        return -1;
      }
      if (b.fileName === 'human.txt') {
        return 1;
      }
      if (a.fileName === 'evalResult.json') {
        return 1;
      }
      if (b.fileName === 'evalResult.json') {
        return -1;
      }
      return 0;
    });

    const response = evalResponseSchema.parse({ files: filesWithContents });

    return Response.json(response, { status: 200 });
  } catch (error) {
    console.error('Error reading eval files:', error);
    return Response.json({ error: 'Failed to read evaluation files' }, { status: 500 });
  }
}
