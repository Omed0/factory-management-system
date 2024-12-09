import { createGlobalState } from '@/lib/state';

export const defaultValue = { dollar: 1500 };

export const useDollar = createGlobalState<typeof defaultValue>('dollar', {
  dollar: defaultValue.dollar,
});
