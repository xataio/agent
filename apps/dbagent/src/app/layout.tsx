import '@xata.io/theme';
import { GeistSans } from 'geist/font/sans';
import { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import { Providers } from '~/components/providers';
import './globals.css';

const geistMono = Geist_Mono({
  variable: '--font-code',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'Xata Agent | Your AI PostgreSQL expert'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en" className={`${GeistSans.className} ${geistMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
