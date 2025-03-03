import { Card, CardContent, cn } from '@internal/components';

interface DatabaseProviderCardProps {
  name: string;
  icon: React.ReactElement;
  isSelected: boolean;
  onClick?: () => void;
  comingSoon?: boolean;
}

export function DatabaseProviderCard({ name, icon: Icon, isSelected, onClick, comingSoon }: DatabaseProviderCardProps) {
  return (
    <Card
      className={cn(
        'flex h-36 w-36 cursor-pointer flex-col items-center justify-center transition-all',
        isSelected ? 'ring-primary ring-2' : 'hover:bg-primary/10',
        !onClick && 'cursor-not-allowed opacity-60'
      )}
      onClick={onClick}
    >
      <CardContent className="relative flex flex-col items-center p-8">
        {Icon}
        <p className="text-center text-sm font-medium">{name}</p>
        {comingSoon && <p className="text-muted-foreground mt-1 text-xs">Coming Soon</p>}
      </CardContent>
    </Card>
  );
}
