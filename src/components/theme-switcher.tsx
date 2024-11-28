'use client';

import { ComponentProps } from 'react';
import { useTheme } from 'next-themes';

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from './ui/label';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type ThemeSwitcherProps = {
  className?: ComponentProps<'button'>['className'];
};

export const ThemeSwitcher = ({ className }: ThemeSwitcherProps) => {
  const { setTheme } = useTheme();

  return (
    <RadioGroup
      defaultValue="light"
      className={cn("flex items-center gap-5", className)}
      onValueChange={(e) => setTheme(e)}
    >
      <div className="flex items-start gap-4">
        <RadioGroupItem value="light" id="light" className='size-6' />
        <Label htmlFor="light">
          <Image
            className='object-cover max-w-72 rounded-lg'
            height={500} alt='light-mode'
            quality={100} width={500}
            src={'/images/light.jpg'}
          />
        </Label>
      </div>
      <div className="flex items-start gap-4">
        <RadioGroupItem value="dark" id="dark" className='size-6' />
        <Label htmlFor="dark">
          <Image
            className='object-cover max-w-72 rounded-lg'
            height={500} alt='dark-mode'
            quality={100} width={500}
            src={'/images/dark.jpg'}
          />
        </Label>
      </div>
    </RadioGroup>
  );
};


//<Button
//className={className}
//variant="secondary"
//size="icon"
//onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
//>

//<Icons.sun className="dark:hidden" />
//<Icons.moon className="hidden dark:block" />
//</Button>