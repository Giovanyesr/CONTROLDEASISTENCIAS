import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <>{children}</>;
};

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        destructive:
          'destructive group border-destructive bg-destructive text-destructive-foreground',
        success: 'border-green-500 bg-green-50 text-green-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  onClose?: () => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, onClose, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      >
        <div className="flex-1">{children}</div>
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-1 top-1 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
Toast.displayName = 'Toast';

type ToastTitleProps = React.HTMLAttributes<HTMLDivElement>;

const ToastTitle = React.forwardRef<HTMLDivElement, ToastTitleProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-sm font-semibold [&+div]:text-xs', className)}
      {...props}
    />
  )
);
ToastTitle.displayName = 'ToastTitle';

type ToastDescriptionProps = React.HTMLAttributes<HTMLDivElement>;

const ToastDescription = React.forwardRef<
  HTMLDivElement,
  ToastDescriptionProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm opacity-90', className)}
    {...props}
  />
));
ToastDescription.displayName = 'ToastDescription';

type ToastVariant = 'default' | 'destructive' | 'success';

interface ToasterToast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToasterProps {
  toasts: ToasterToast[];
  removeToast: (id: string) => void;
}

const Toaster = ({ toasts, removeToast }: ToasterProps) => {
  return (
    <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          onClose={() => removeToast(toast.id)}
        >
          <div className="grid gap-1">
            {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
            {toast.description && (
              <ToastDescription>{toast.description}</ToastDescription>
            )}
          </div>
        </Toast>
      ))}
    </div>
  );
};

export type { ToastVariant, ToasterToast, ToastProps };
export {
  Toast,
  ToastProvider,
  ToastTitle,
  ToastDescription,
  Toaster,
  toastVariants,
};
