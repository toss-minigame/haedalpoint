import { cn } from 'cn';
import { Dialog as DialogPrimitive } from 'radix-ui';
import type * as React from 'react';

// 화면 아래에서 올라오는 모달. 닫기 버튼은 각 화면이 내용 안에 직접 둔다 (막다른 화면이 되지 않게)
function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-xl flex-col gap-4 rounded-t-2xl bg-background p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-xl font-bold', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-base text-muted-foreground', className)}
      {...props}
    />
  );
}

const DialogClose = DialogPrimitive.Close;

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle };
