import { PropsWithChildren } from 'react';
import { cn } from '../../lib/utils';

export const PROSE_CLASSES = 'prose prose-zinc dark:prose-invert prose-headings:scroll-m-20';
export const IMG_CLASSES = 'prose-img:rounded-md prose-img:border';
export const CODE_CLASSES =
  'prose-code:text-[12px] prose-code:font-semibold dark:prose-code:text-white prose-code:text-zinc-800 prose-code:p-1 prose-code:rounded-md prose-code:border prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:font-code dark:prose-code:bg-zinc-900/25 prose-code:bg-zinc-50 prose-pre:bg-background prose-code:before:content-none prose-code:after:content-none prose-code:px-1.5 prose-code:overflow-x-aut';
export const WIDTH_CLASSES = 'w-[85vw] !min-w-full pt-2 sm:mx-auto sm:w-full';

export function Typography({ children }: PropsWithChildren) {
  return <div className={cn(PROSE_CLASSES, IMG_CLASSES, CODE_CLASSES, WIDTH_CLASSES)}>{children}</div>;
}
