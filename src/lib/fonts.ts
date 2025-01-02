import { JetBrains_Mono } from 'next/font/google';
import LocalFont from 'next/font/local';

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const unisirwan = LocalFont({
  src: [
    {
      path: '../../public/fonts/unisirwan_regular.ttf',
      style: 'normal',
      weight: '400',
    },
    {
      path: '../../public/fonts/unisirwan_bold.ttf',
      style: 'bold',
      weight: '700',
    },
  ],
  variable: '--font-unisirwan',
  display: 'swap',
  preload: true,
});

//export const rabar = LocalFont({
//  src: '../../public/fonts/rabar_21.woff',
//  variable: '--font-rabar',
//  display: 'swap',
//  preload: true,
//});

export const fonts = [unisirwan.className, fontMono.variable];
