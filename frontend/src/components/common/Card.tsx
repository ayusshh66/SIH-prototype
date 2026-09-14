import React from 'react';
import { motion } from 'framer-motion';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  interactive?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface CardComponent extends React.FC<CardProps> {
  Header: typeof CardHeader;
  Body: typeof CardBody;
  Footer: typeof CardFooter;
}

export const CardHeader: React.FC<{
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}> = ({ title, eyebrow, subtitle, actions, children, className = '' }) => (
  <div className={`px-5 py-3.5 border-b border-border-hairline flex items-center justify-between gap-4 ${className}`}>
    <div>
      {eyebrow && (
        <div className="text-micro uppercase text-content-tertiary font-mono tracking-wider mb-0.5">
          {eyebrow}
        </div>
      )}
      {title && (
        <div className="text-h3 text-content-primary font-semibold">
          {title}
        </div>
      )}
      {subtitle && (
        <div className="text-small text-content-secondary mt-0.5">
          {subtitle}
        </div>
      )}
      {children}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`p-5 flex-1 ${className}`}>{children}</div>;

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`px-5 py-3 border-t border-border-subtle bg-surface-sunken/40 text-content-secondary text-small ${className}`}>
    {children}
  </div>
);

export const Card: CardComponent = ({
  title,
  eyebrow,
  subtitle,
  actions,
  children,
  footer,
  interactive = false,
  className = '',
  style,
  ...props
}) => {
  const baseClasses = `bg-surface border border-border-hairline rounded-md flex flex-col overflow-hidden transition-colors ${
    interactive ? 'hover:border-border-strong cursor-pointer' : ''
  } ${className}`;

  if (interactive) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.15 }}
        className={baseClasses}
        style={style}
        {...(props as any)}
      >
        {(title || eyebrow || subtitle || actions) && (
          <CardHeader title={title} eyebrow={eyebrow} subtitle={subtitle} actions={actions} />
        )}
        <CardBody>{children}</CardBody>
        {footer && <CardFooter>{footer}</CardFooter>}
      </motion.div>
    );
  }

  return (
    <div className={baseClasses} style={style} {...props}>
      {(title || eyebrow || subtitle || actions) && (
        <CardHeader title={title} eyebrow={eyebrow} subtitle={subtitle} actions={actions} />
      )}
      <CardBody>{children}</CardBody>
      {footer && <CardFooter>{footer}</CardFooter>}
    </div>
  );
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
