import { motion } from 'framer-motion';
import Link from 'next/link';
import { MessageIcon, VercelIcon } from '../icons';

export const Overview = () => {
  return (
    <motion.div
      key="overview"
      className="mx-auto max-w-3xl md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="flex max-w-xl flex-col gap-8 rounded-xl p-6 text-center leading-relaxed">
        <p className="flex flex-row items-center justify-center gap-4">
          <VercelIcon size={32} />
          <span>+</span>
          <MessageIcon size={32} />
        </p>
        <p>
          This is an{' '}
          <Link
            className="font-medium underline underline-offset-4"
            href="https://github.com/vercel/ai-chatbot"
            target="_blank"
          >
            open source
          </Link>{' '}
          chatbot template built with Next.js and the AI SDK by Vercel. It uses the{' '}
          <code className="bg-muted rounded-md px-1 py-0.5">streamText</code> function in the server and the{' '}
          <code className="bg-muted rounded-md px-1 py-0.5">useChat</code> hook on the client to create a seamless chat
          experience.
        </p>
        <p>
          You can learn more about the AI SDK by visiting the{' '}
          <Link className="font-medium underline underline-offset-4" href="https://sdk.vercel.ai/docs" target="_blank">
            docs
          </Link>
          .
        </p>
      </div>
    </motion.div>
  );
};
