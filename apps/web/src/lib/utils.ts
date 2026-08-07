import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Soft ivory placeholder shown while a next/image is loading (placeholder="blur"). */
export const IMAGE_BLUR_DATA_URL =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32"><rect width="24" height="32" fill="#f4ecdd"/></svg>',
  ).toString('base64');
