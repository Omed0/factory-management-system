'use server';

import { getDollar, updateDollar } from '@/server/access-layer/box';

export async function getDollarActions() {
  const dollar = await getDollar();
  if (dollar === null || 'error' in dollar) {
    return {
      success: false,
      message: dollar?.error || 'هەڵەیەک ڕوویدا',
    };
  }
  return { success: true, data: dollar };
}

export async function updateDollarActions(formData: FormData) {
  const amount = formData.get('dollar');
  if (!amount)
    return {
      success: false,
      message: 'بڕی دۆلار دیاریبکە',
    };

  const calc = Number(amount) / 100;
  const dollar = await updateDollar(calc);

  if (dollar === null || 'error' in dollar) {
    return {
      success: false,
      message: dollar?.error || 'هەڵەیەک ڕوویدا',
    };
  }
  return { success: true, data: dollar, message: 'دۆلار تازەکرایەوە' };
}
