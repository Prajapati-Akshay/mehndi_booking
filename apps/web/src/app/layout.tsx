import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { WhatsAppFloat } from '@/components/whatsapp-float';
import './globals.css';

const heading = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mehndibydhara.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Mehndi By Dhara | Premium Mehndi Artist & Booking',
    template: '%s | Mehndi By Dhara',
  },
  description:
    'Book beautiful Arabic, Bridal, Engagement, Designer and Traditional Mehndi with Mehndi By Dhara.',
  openGraph: {
    title: 'Mehndi By Dhara | Premium Mehndi Artist & Booking',
    description:
      'Book beautiful Arabic, Bridal, Engagement, Designer and Traditional Mehndi with Mehndi By Dhara.',
    url: siteUrl,
    siteName: 'Mehndi By Dhara',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mehndi By Dhara | Premium Mehndi Artist & Booking',
    description:
      'Book beautiful Arabic, Bridal, Engagement, Designer and Traditional Mehndi with Mehndi By Dhara.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body className="font-sans antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
        <WhatsAppFloat />
      </body>
    </html>
  );
}
