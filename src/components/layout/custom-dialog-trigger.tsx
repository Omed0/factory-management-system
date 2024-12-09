'use client';

import { DialogProps } from '@radix-ui/react-dialog';

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  children: React.ReactNode;
  button: React.ReactNode;
  onOpenChange?: DialogProps['onOpenChange'];
  open?: boolean;
};

export default function CustomDialogWithTrigger({
  button,
  children,
  onOpenChange,
  open,
  className,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{button}</DialogTrigger>
      <DialogContent
        className={cn(
          'max-h-[95%] w-[97%] min-w-0 overflow-y-auto overflow-x-hidden rounded-lg border-none p-0 outline-none md:max-w-[44rem]',
          className
        )}
      >
        <DialogTitle hidden></DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
