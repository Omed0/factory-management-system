'use client';

import { ReactNode, useState } from 'react';
import { DialogContent } from '@radix-ui/react-dialog';
import { CircleAlert, Trash } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type ConfirmationModalProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  onConfirm: () => Promise<{ message: string; success: boolean }>;
  onClose?: () => void;
  children: ReactNode;
};

export default function ConfirmationDeleteModal({
  title,
  description,
  icon = <CircleAlert size={28} className="stroke-[1.5px]" />,
  onConfirm,
  onClose,
  children,
}: ConfirmationModalProps) {
  const [open, setOpen] = useState(false);

  const handleChange = () => {
    if (open) {
      setOpen(false);
      onClose?.();
    } else {
      setOpen(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleChange}>
      <DialogTrigger>{children}</DialogTrigger>
      <DialogContent className="flex flex-col overflow-hidden px-12 py-10 md:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            <span className="mx-auto block w-fit rounded-full bg-red-200/80 p-2">
              {icon}
            </span>
          </DialogTitle>
        </DialogHeader>
        <form
          action={async () => {
            const { message, success } = await onConfirm();
            if (success) {
              toast.success(message);
              handleChange();
            } else {
              toast.error(message);
            }
          }}
          className="flex w-full flex-col gap-4"
        >
          <div className="space-y-2 text-center">
            <h2 className="text-foreground text-xl">{title}</h2>
            <p className="text-foreground/60 text-base">{description}</p>
          </div>
          <DialogFooter className="mt-3 w-full gap-3 sm:justify-center">
            <Button variant={'outline'} className="w-full" type="submit">
              <Trash className="size-5" />
              دڵنیام
            </Button>
            <Button
              onClick={handleChange}
              variant="destructive"
              type="reset"
              className="w-full"
            >
              گەڕانەوە
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
