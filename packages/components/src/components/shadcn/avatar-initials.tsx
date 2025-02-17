import { AvatarFallbackProps } from '@radix-ui/react-avatar';
import { PropsWithChildren } from 'react';
import { AvatarFallback } from './avatar';

export const AvatarInitials = ({ children, ...props }: PropsWithChildren<AvatarFallbackProps>) => {
  return <AvatarFallback {...props}>{getInitials(children)}</AvatarFallback>;
};

function getInitials(name?: any) {
  if (!name || typeof name !== 'string') return '';

  const [firstName, lastName] = name.split(' ');
  return firstName?.charAt(0) + (lastName ? lastName.charAt(0) : '').toUpperCase();
}
