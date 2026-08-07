import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type TierInput = { lengthLabel: string; price: number; whatsIncluded: string };
type ServiceInput = { name: string; description?: string; tiers: TierInput[] };
type CategoryInput = { slug: string; name: string; description: string; services: ServiceInput[] };

const CATALOG: CategoryInput[] = [
  {
    slug: 'arabic-mehndi',
    name: 'Arabic Mehndi',
    description: 'Bold flowing floral vines and heavy Arabic patterns.',
    services: [
      {
        name: 'Arabic Mehndi',
        tiers: [
          { lengthLabel: 'Palm Length', price: 200, whatsIncluded: '400 Heavy Arabic' },
          { lengthLabel: '2 Finger above Palm / Wrist Length', price: 250, whatsIncluded: '600 Heavy Arabic' },
          { lengthLabel: '4 Finger above Palm / Bangle Length', price: 300, whatsIncluded: '800 Heavy Arabic' },
          { lengthLabel: '1/2 Hand / Half Hand', price: 350, whatsIncluded: '1000 Heavy Arabic' },
          { lengthLabel: '3/4th Length', price: 400, whatsIncluded: '1500 Heavy Arabic' },
          { lengthLabel: 'Elbow Length', price: 450, whatsIncluded: '1800 Heavy Arabic' },
        ],
      },
    ],
  },
  {
    slug: 'designer-fancy-mehndi',
    name: 'Designer / Fancy Mehndi',
    description: 'Intricate mandala and fancy heavy designs.',
    services: [
      {
        name: 'Designer / Fancy Mehndi',
        tiers: [
          { lengthLabel: 'Palm Length', price: 250, whatsIncluded: 'Fancy/Mandala' },
          { lengthLabel: '2 Finger above Palm / Wrist Length', price: 300, whatsIncluded: '700 Intricate Heavy design' },
          { lengthLabel: '4 Finger above Palm / Bangle Length', price: 400, whatsIncluded: '1100 Intricate Heavy Designs' },
          { lengthLabel: '1/2 Hand / Half Hand', price: 550, whatsIncluded: '1500 Intricate Heavy design' },
        ],
      },
    ],
  },
  {
    slug: 'indian-traditional',
    name: 'Indian Traditional',
    description: 'Classic Indian motifs with peacocks and elephants.',
    services: [
      {
        name: 'Indian Traditional',
        tiers: [
          { lengthLabel: 'Palm Length', price: 350, whatsIncluded: 'Designer' },
          { lengthLabel: '2 Finger above Palm / Wrist Length', price: 450, whatsIncluded: 'Heavy Designer' },
          { lengthLabel: '4 Finger above Palm / Bangle Length', price: 500, whatsIncluded: 'Heavy Designer' },
          { lengthLabel: '1/2 Hand / Half Hand', price: 550, whatsIncluded: 'With Peacock, Elephant' },
          { lengthLabel: '3/4th Length', price: 650, whatsIncluded: 'With Peacock, Elephant' },
          { lengthLabel: 'Elbow Length', price: 900, whatsIncluded: 'With Peacock, Elephant' },
        ],
      },
    ],
  },
  {
    slug: 'engagement-mehndi',
    name: 'Engagement Mehndi',
    description: 'Ring ceremony themed designs with figures.',
    services: [
      {
        name: 'Engagement Mehndi',
        tiers: [
          { lengthLabel: '4 Finger above Palm / Bangle Length', price: 600, whatsIncluded: 'Basic design with ring ceremony figure (rings, name or letter)' },
          { lengthLabel: '1/2 Hand / Half Hand', price: 800, whatsIncluded: 'Heavy with Peacock + elephant' },
          { lengthLabel: '3/4th Length', price: 900, whatsIncluded: 'Heavy with Ring ceremony Figures' },
          { lengthLabel: 'Elbow Length', price: 1200, whatsIncluded: 'Customised couple figure design' },
        ],
      },
    ],
  },
  {
    slug: 'bridal-mehndi',
    name: 'Bridal Mehndi',
    description: 'Elaborate bridal designs with feet included.',
    services: [
      {
        name: 'Bridal Mehndi',
        tiers: [
          { lengthLabel: '1/2 Hand / Half Hand', price: 1000, whatsIncluded: 'Basic Bridal design with ankle length feet design' },
          { lengthLabel: '3/4th Length', price: 1500, whatsIncluded: 'Basic figure kalash, ganpavesh with ankle length feet design' },
          { lengthLabel: 'Elbow Length', price: 3000, whatsIncluded: '1 Bride 1 groom figure ankle length feet design' },
          { lengthLabel: 'Elbow Length (Standing Figures)', price: 3500, whatsIncluded: '1 standing Bride 1 groom standing figure ankle length' },
          { lengthLabel: 'Elbow Length (Intricate)', price: 4500, whatsIncluded: 'Intricate bride groom + Shiv Parvati / Radha Krishna / Vishnu Lakshmi figure' },
        ],
      },
    ],
  },
  {
    slug: 'feet-mehndi',
    name: 'Feet Mehndi',
    description: 'Beautiful feet designs to complement any look.',
    services: [
      {
        name: 'Feet Mehndi',
        tiers: [
          { lengthLabel: '2 Finger above ankle length', price: 1000, whatsIncluded: 'Per figure extra' },
          { lengthLabel: '4 Finger above ankle length', price: 1500, whatsIncluded: 'Per figure extra' },
          { lengthLabel: 'Peacock elephant', price: 500, whatsIncluded: 'Per figure extra' },
        ],
      },
    ],
  },
];

async function main() {
  console.log('Seeding categories, services, pricing...');
  for (const [catIndex, cat] of CATALOG.entries()) {
    const category = await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, sortOrder: catIndex },
      create: { slug: cat.slug, name: cat.name, description: cat.description, sortOrder: catIndex },
    });

    for (const [svcIndex, svc] of cat.services.entries()) {
      const existing = await prisma.service.findFirst({ where: { categoryId: category.id, name: svc.name } });
      const service = existing
        ? await prisma.service.update({ where: { id: existing.id }, data: { description: svc.description, sortOrder: svcIndex } })
        : await prisma.service.create({
            data: { categoryId: category.id, name: svc.name, description: svc.description, sortOrder: svcIndex },
          });

      for (const [tierIndex, tier] of svc.tiers.entries()) {
        const existingTier = await prisma.servicePricing.findFirst({
          where: { serviceId: service.id, lengthLabel: tier.lengthLabel },
        });
        if (existingTier) {
          await prisma.servicePricing.update({
            where: { id: existingTier.id },
            data: { price: tier.price, whatsIncluded: tier.whatsIncluded, sortOrder: tierIndex },
          });
        } else {
          await prisma.servicePricing.create({
            data: {
              serviceId: service.id,
              lengthLabel: tier.lengthLabel,
              price: tier.price,
              whatsIncluded: tier.whatsIncluded,
              sortOrder: tierIndex,
            },
          });
        }
      }
    }
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@mehndibydhara.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash, name: 'Dhara', role: 'ADMIN' },
  });
  console.log(`Admin user ready: ${adminEmail} (password from SEED_ADMIN_PASSWORD env, default if unset)`);

  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    date.setHours(0, 0, 0, 0);
    const availability = await prisma.availability.upsert({
      where: { date },
      update: {},
      create: { date, isAvailable: true },
    });
    const slots = ['10:00-11:00', '11:30-12:30', '14:00-15:00', '15:30-16:30', '17:00-18:00'];
    for (const slot of slots) {
      const [startTime, endTime] = slot.split('-');
      const existingSlot = await prisma.timeSlot.findFirst({
        where: { availabilityId: availability.id, startTime },
      });
      if (!existingSlot) {
        await prisma.timeSlot.create({
          data: { availabilityId: availability.id, startTime, endTime },
        });
      }
    }
  }

  const testimonialCount = await prisma.testimonial.count();
  if (testimonialCount === 0) {
    await prisma.testimonial.createMany({
      data: [
        { customerName: 'Priya S.', message: 'Dhara did my bridal mehndi and it was absolutely stunning. Everyone at the wedding was asking about it!', rating: 5 },
        { customerName: 'Ankita M.', message: 'Beautiful Arabic design, quick and neat application. Highly recommend for engagement functions.', rating: 5 },
        { customerName: 'Rina P.', message: 'Loved the traditional peacock design on my hands. Stain came out gorgeous.', rating: 5 },
      ],
    });
  }

  const GALLERY_ITEMS = [
    { title: 'Arabic Vine Forearm', category: 'arabic-mehndi', imageUrl: '/gallery/arabic-greenery-forearm.jpg' },
    { title: 'Arabic Floral Forearm', category: 'arabic-mehndi', imageUrl: '/gallery/arabic-outdoor-forearm.jpg' },
    { title: 'Bridal Geometric Elbow Design', category: 'bridal-mehndi', imageUrl: '/gallery/bridal-elbow-geometric.jpg' },
    { title: 'Bridal Full Hand Floral', category: 'bridal-mehndi', imageUrl: '/gallery/bridal-full-hand-floral.jpg' },
    { title: 'Heavy Bridal Elbow Design', category: 'bridal-mehndi', imageUrl: '/gallery/bridal-heavy-elbow-dark.jpg' },
    { title: 'Ornate Peacock Bridal Design', category: 'bridal-mehndi', imageUrl: '/gallery/bridal-peacock-ornate.jpg' },
    { title: 'Mandala Sleeve Design', category: 'designer-fancy-mehndi', imageUrl: '/gallery/designer-mandala-sleeve.jpg' },
    { title: 'Fancy Palm Mandala', category: 'designer-fancy-mehndi', imageUrl: '/gallery/designer-palm-mandala-1.jpg' },
    { title: 'Circular Palm Mandala', category: 'designer-fancy-mehndi', imageUrl: '/gallery/designer-palm-mandala-2.jpg' },
    { title: 'Ring Ceremony Design', category: 'engagement-mehndi', imageUrl: '/gallery/engagement-ring-ceremony.jpg' },
    { title: 'Elephant & Lotus Feet Design', category: 'feet-mehndi', imageUrl: '/gallery/feet-elephants-lotus.jpg' },
    { title: 'Flamingo Anklet Feet Design', category: 'feet-mehndi', imageUrl: '/gallery/feet-flamingo-anklet.jpg' },
    { title: 'Peacock Anklet Feet Design', category: 'feet-mehndi', imageUrl: '/gallery/feet-mandala-anklet.jpg' },
    { title: 'Traditional Elephant Design', category: 'indian-traditional', imageUrl: '/gallery/traditional-elephants-backhand.jpg' },
    { title: 'Peacock & Elephant Traditional', category: 'indian-traditional', imageUrl: '/gallery/traditional-peacock-elephant.jpg' },
  ];

  await prisma.gallery.deleteMany({ where: { imageUrl: { in: ['/gallery/bridal-1.jpg', '/gallery/arabic-1.jpg', '/gallery/traditional-1.jpg', '/gallery/engagement-1.jpg', '/gallery/feet-1.jpg', '/gallery/designer-1.jpg'] } } });

  for (const [index, item] of GALLERY_ITEMS.entries()) {
    const existing = await prisma.gallery.findFirst({ where: { imageUrl: item.imageUrl } });
    if (existing) {
      await prisma.gallery.update({ where: { id: existing.id }, data: { ...item, sortOrder: index } });
    } else {
      await prisma.gallery.create({ data: { ...item, sortOrder: index } });
    }
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
