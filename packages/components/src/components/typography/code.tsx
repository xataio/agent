import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export interface CodeProps extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof codeVariants> {
  children: React.ReactNode;
}

export const codeVariants = cva(
  'not-prose font-semibold p-1 rounded-sm font-code px-1.5 overflow-x-auto font-code text-sm',
  {
    variants: {
      variant: {
        default: 'bg-zinc-200 dark:bg-zinc-700',
        primary: 'bg-primary/10 dark:text-purple-300 text-purple-700'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

export const Code: React.FC<CodeProps> = ({ children, className, variant, ...props }) => (
  <code className={cn(codeVariants({ variant }), className)} {...props}>
    {children}
  </code>
);
