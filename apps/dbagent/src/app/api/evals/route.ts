import fs from 'fs/promises';
import { NextRequest } from 'next/server';
import path from 'path';
import { z } from 'zod';
import { evalResponseSchema } from '~/evals/api-schemas';
import { EVAL_REPLAY_FILE_NAME, EVAL_RESULT_FILE_NAME } from '~/evals/lib/consts';
import { env } from '~/lib/env/server';

export async function GET(request: NextRequest) {
  try {
    if (env.EVAL !== 'true') {
      throw new Error('EVAL environment variable must be set to 1');
    }
    if (!env.EVAL_FOLDER) {
      throw new Error('EVAL_FOLDER environment variable must be set');
    }
    const searchParams = request.nextUrl.searchParams;

    const folderParam = z
      .string()
      .min(1)
      .refine((val) => !val.includes('/') && !val.includes('\\'), {
        message: 'Folder cannot contain path separators'
      })
      .safeParse(searchParams.get('folder'));

    if (!folderParam.success) {
      return Response.json({ error: `Invalid folder parameter: ${folderParam.error.message}` }, { status: 400 });
    }

    const folderPath = folderParam.data;
    const absFolderPath = path.join(env.EVAL_FOLDER, folderPath);

    const files = await fs.readdir(absFolderPath);

    const filesWithContents = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(absFolderPath, file);
        const contents = await fs.readFile(filePath, 'utf-8');
        return {
          fileName: path.basename(file),
          contents
        };
      })
    );

    const fileOrder = ['human.txt', EVAL_REPLAY_FILE_NAME, 'response.json', EVAL_RESULT_FILE_NAME];
    const getFileOrder = (fileName: string) => {
      const index = fileOrder.indexOf(fileName);
      return index === -1 ? fileOrder.length : index;
    };
    filesWithContents.sort((a, b) => getFileOrder(a.fileName) - getFileOrder(b.fileName));

    const response = evalResponseSchema.parse({ files: filesWithContents });

    return Response.json(response, { status: 200 });
  } catch (error) {
    console.error('Error reading eval files:', error);
    return Response.json({ error: 'Failed to read evaluation files' }, { status: 500 });
  }
}
