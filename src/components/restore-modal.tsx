'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import { toast } from 'sonner';

import CustomDialogWithTrigger from './layout/custom-dialog-trigger';

import { Button } from '@/components/ui/button';
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type DialogModalProps<T> = {
  restorKey: T;
  onClose?: () => void;
  action: (key: T) => Promise<{ message: string; success: boolean }>;
  classNameButton?: string;
  title?: string;
  description?: string;
};

export default function RestorModal<T>({
  restorKey,
  onClose,
  action,
  classNameButton,
  title,
  description,
}: DialogModalProps<T>) {
  const [open, setOpen] = useState(false);

  const handleChange = () => {
    if (open) {
      setOpen(false);
      onClose && onClose();
    } else {
      setOpen(true);
    }
  };

  return (
    <CustomDialogWithTrigger
      open={open}
      onOpenChange={handleChange}
      button={
        <Button variant="link" className={classNameButton}>
          <History className="me-1 size-5" />
          هێنانەوە
        </Button>
      }
      className="flex flex-col overflow-hidden px-12 py-10 md:max-w-xl"
    >
      <DialogHeader>
        <DialogTitle>
          <span className="mx-auto block w-fit rounded-full bg-red-200/80 p-2">
            <History size={28} color="red" className="stroke-[1.5px]" />
          </span>
        </DialogTitle>
      </DialogHeader>
      <form
        action={async () => {
          if (restorKey) {
            const { message, success } = await action(restorKey);
            if (success) {
              toast.info(message);
              handleChange();
              return;
            }
            toast.error(message);
            return;
          }
          toast.error('ئەم داتایە نەدۆزرایەوە');
        }}
        className="flex w-full flex-col gap-4"
      >
        <div className="space-y-2 text-center">
          <h2 className="text-foreground text-xl">
            هێنانەوەی {title ?? 'ئەم داتایە'}
          </h2>
          <p className="text-foreground/60 text-base">
            {description ?? 'دڵنیای لە هێنانەوەی ئەم داتایە..؟'}
          </p>
        </div>
        <DialogFooter className="mt-3 w-full gap-3 sm:justify-center">
          <Button className="w-full" type="submit">
            هێنانەوە
          </Button>
          <Button
            onClick={handleChange}
            variant="outline"
            type="reset"
            className="w-full"
          >
            داخستن
          </Button>
        </DialogFooter>
      </form>
    </CustomDialogWithTrigger>
  );
}
