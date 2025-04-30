export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-muted animate-pulse rounded-md ${className}`} {...props} />;
}
