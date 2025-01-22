'use client';

import { DollarSign } from 'lucide-react';
import { toast } from 'sonner';

import { updateDollarActions } from '@/actions/boxes';
import CustomDialogWithTrigger from '@/components/layout/custom-dialog-trigger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMemo, useRef, useTransition } from 'react';

type Props = {
  dollar: number;
};

export default function FormDollar({ dollar }: Props) {
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null)
  const formatDollar = useMemo(() => {
    return Number(dollar * 100);
  }, [dollar])

  return (
    <CustomDialogWithTrigger
      button={
        <Button variant="default" size="sm">
          <DollarSign />
        </Button>
      }
      className="p-14 md:max-w-96"
    >
      <form
        dir="rtl"
        className="flex flex-col gap-4"
        action={async (formData: FormData) => {
          startTransition(async () => {
            const { message, success } = await updateDollarActions(formData);
            if (!success) {
              toast.error(message);
              return;
            }
            if (inputRef.current) {
              inputRef.current.value = "";
            }
            toast.success(message);
          })
        }}
      >
        <div className="flex items-center justify-between gap-4 rounded border p-2">
          <p>نرخی دۆلار : </p>
          <p>{isPending ? "تازەکردنەوە..." : formatDollar.toLocaleString()}</p>
        </div>
        <Label htmlFor="dollar" className="w-full">
          <Input
            name="dollar"
            placeholder="نرخی تازەی دۆلار بنووسە"
            className="w-full"
            ref={inputRef}
          />
        </Label>
        <Button disabled={isPending}>
          تازەکردنەوە
          <DollarSign className="size-5" />
        </Button>
      </form>
    </CustomDialogWithTrigger>
  );
}
