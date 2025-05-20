import { Code } from '@xata.io/components';
import Link from 'next/link';
import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components: Partial<Components> = {
  code: ({ children }) => <Code variant="default">{children}</Code>,
  pre: ({ children }) => <>{children}</>,
  ol: ({ node, children, ...props }) => {
    return <ol {...props}>{children}</ol>;
  },
  li: ({ node, children, ...props }) => {
    return <li {...props}>{children}</li>;
  },
  ul: ({ node, children, ...props }) => {
    return <ul {...props}>{children}</ul>;
  },
  strong: ({ node, children, ...props }) => {
    return <span {...props}>{children}</span>;
  },
  a: ({ node, children, ...props }) => {
    return (
      // @ts-expect-error
      <Link className="text-link hover:underline" target="_blank" rel="noreferrer" {...props}>
        {children}
      </Link>
    );
  },
  h1: ({ node, children, ...props }) => {
    return <h1 {...props}>{children}</h1>;
  },
  h2: ({ node, children, ...props }) => {
    return <h2 {...props}>{children}</h2>;
  },
  h3: ({ node, children, ...props }) => {
    return <h3 {...props}>{children}</h3>;
  },
  h4: ({ node, children, ...props }) => {
    return <h4 {...props}>{children}</h4>;
  },
  h5: ({ node, children, ...props }) => {
    return <h5 {...props}>{children}</h5>;
  },
  h6: ({ node, children, ...props }) => {
    return <h6 {...props}>{children}</h6>;
  }
};

const remarkPlugins = [remarkGfm];

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
      {children}
    </ReactMarkdown>
  );
};

export const Markdown = memo(NonMemoizedMarkdown, (prevProps, nextProps) => prevProps.children === nextProps.children);
