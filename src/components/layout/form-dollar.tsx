'use client';

import { DollarSign } from 'lucide-react';
import { toast } from 'sonner';

import { updateDollarActions } from '@/actions/boxes';
import CustomDialogWithTrigger from '@/components/layout/custom-dialog-trigger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  dollar: number;
};

export default function FormDollar({ dollar }: Props) {
  const formatDollar = Number(dollar * 100);

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
          const res = await updateDollarActions(formData);
          if (!res.success) {
            toast.error(res.message);
            return;
          }
          toast.success(res.message);
        }}
      >
        <div className="flex items-center justify-between gap-4 rounded border p-2">
          <p>نرخی دۆلار : </p>
          <p>{formatDollar.toLocaleString()}</p>
        </div>
        <Label htmlFor="dollar" className="w-full">
          <Input
            name="dollar"
            placeholder="نرخی تازەی دۆلار بنووسە"
            className="w-full"
          />
        </Label>
        <Button className="">
          تازەکردنەوە
          <DollarSign className="size-5" />
        </Button>
      </form>
    </CustomDialogWithTrigger>
  );
}
