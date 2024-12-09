'use client';

import { useState } from 'react';
import { CircleAlert, Trash } from 'lucide-react';
import { toast } from 'sonner';

import CustomDialogWithTrigger from './layout/custom-dialog-trigger';

import { Button } from '@/components/ui/button';
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type DialogModalProps<T> = {
  deleteKey: T;
  onClose?: () => void;
  submit: (id: T) => Promise<{ message: string; success: boolean }>;
  classNameButton?: string;
  title?: string;
  description?: string;
  isTrash?: boolean;
};

export default function DeleteModal<T>({
  deleteKey,
  onClose,
  submit,
  classNameButton,
  title,
  description,
  isTrash,
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
      onOpenChange={(e) => {
        if (!e) {
          onClose && onClose();
        }
        setOpen(e);
      }}
      button={
        <Button variant="destructive" className={classNameButton}>
          <Trash className="me-1 size-5" />
          {isTrash ? 'سڕینەوە' : 'ئەرشیفکردن'}
        </Button>
      }
      className="flex flex-col overflow-hidden px-12 py-10 md:max-w-xl"
    >
      <DialogHeader>
        <DialogTitle>
          <span className="mx-auto block w-fit rounded-full bg-red-200/80 p-2">
            <CircleAlert size={28} color="red" className="stroke-[1.5px]" />
          </span>
        </DialogTitle>
      </DialogHeader>
      <form
        action={async () => {
          if (deleteKey) {
            const { message, success } = await submit(deleteKey);
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
            {isTrash ? 'سڕینەوەی' : 'ئەرشیڤکردنی'} {title ?? 'ئەم داتایە'}
          </h2>
          <p className="text-foreground/60 text-base">
            {description ?? 'دڵنیای لە سڕینەوە ئەم داتایە..؟'}
          </p>
        </div>
        <DialogFooter className="mt-3 w-full gap-3 sm:justify-center">
          <Button variant="destructive" className="w-full" type="submit">
            {isTrash ? 'سڕینەوە' : 'ئەرشیفکردن'}
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
