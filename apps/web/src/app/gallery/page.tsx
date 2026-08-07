import type { Metadata } from 'next';
import Image from 'next/image';
import { api } from '@/lib/api';
import { IMAGE_BLUR_DATA_URL } from '@/lib/utils';
import type { GalleryItem } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'Browse our portfolio of Bridal, Arabic, Engagement, Traditional and Feet Mehndi designs.',
};

const CATEGORY_LABELS: Record<string, string> = {
  'arabic-mehndi': 'Arabic',
  'designer-fancy-mehndi': 'Designer / Fancy',
  'indian-traditional': 'Indian Traditional',
  'engagement-mehndi': 'Engagement',
  'bridal-mehndi': 'Bridal',
  'feet-mehndi': 'Feet',
};

async function getGallery() {
  try {
    return await api.get<GalleryItem[]>('/gallery');
  } catch {
    return [];
  }
}

export default async function GalleryPage() {
  const items = await getGallery();

  return (
    <div className="container py-16 sm:py-20">
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-gold-500 text-sm tracking-widest uppercase font-medium">Portfolio</span>
        <h1 className="section-heading mt-3">Our Mehndi Gallery</h1>
        <p className="mt-4 text-forest-800/70">A glimpse of designs crafted for weddings, engagements and celebrations.</p>
      </div>

      {items.length === 0 ? (
        <p className="text-center mt-16 text-forest-700/60">Gallery coming soon. Follow us on Instagram @mehndibydhara.</p>
      ) : (
        <div className="mt-16 columns-2 sm:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
          {items.map((item) => (
            <div
              key={item.id}
              className="mb-4 break-inside-avoid group relative overflow-hidden rounded-2xl border border-gold-200 shadow-card"
            >
              <Image
                src={item.imageUrl}
                alt={item.title ?? 'Mehndi design by Mehndi By Dhara'}
                width={600}
                height={800}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                placeholder="blur"
                blurDataURL={IMAGE_BLUR_DATA_URL}
                className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest-900/80 via-forest-900/20 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.category && (
                  <span className="inline-block rounded-full bg-gold-400 text-forest-900 text-[10px] font-semibold px-2 py-0.5 mb-1">
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </span>
                )}
                <p className="text-ivory text-sm font-medium">{item.title}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
