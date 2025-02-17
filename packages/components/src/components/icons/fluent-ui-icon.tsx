'use client';

import * as FluentIcons from '@fluentui/react-icons';

type AllIcons = keyof typeof FluentIcons & (`${string}20Regular` | `${string}20Filled`);

type IconName<T> = T extends `${infer Regular}20Regular`
  ? Regular
  : T extends `${infer Filled}20Filled`
    ? Filled
    : never;

type IconProps = {
  name: IconName<AllIcons>;
  type?: 'regular' | 'filled';
  className?: string;
};

export const FluentIcon = (props: IconProps) => {
  const { name, type, className } = props;
  const fullName = `${name}${type === 'filled' ? '20Filled' : '20Regular'}`;

  const Component = FluentIcons[fullName as AllIcons];
  if (!Component) return null;

  return <Component className={className} />;
};
