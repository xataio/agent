'use client';

import * as ReactIcons from 'react-icons/si';

type AllIcons = keyof typeof ReactIcons;

type IconProps = {
  name: AllIcons;
  className?: string;
};

export const ReactIcon = (props: IconProps) => {
  const { name, className } = props;

  const Component = ReactIcons[name];

  if (!Component) return null;

  return <Component className={className} />;
};
