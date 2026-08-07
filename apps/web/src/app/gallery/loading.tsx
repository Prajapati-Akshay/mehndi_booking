export default function GalleryLoading() {
  const heights = ['h-64', 'h-80', 'h-56', 'h-72', 'h-60', 'h-80', 'h-64', 'h-72'];

  return (
    <div className="container py-16 sm:py-20">
      <div className="text-center max-w-2xl mx-auto animate-pulse">
        <div className="h-3 w-24 bg-gold-200 rounded-full mx-auto" />
        <div className="mt-4 h-8 w-64 bg-gold-100 rounded-lg mx-auto" />
        <div className="mt-4 h-4 w-80 max-w-full bg-gold-100 rounded-lg mx-auto" />
      </div>

      <div className="mt-16 columns-2 sm:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className={`mb-4 break-inside-avoid rounded-2xl border border-gold-200 bg-gold-100/60 animate-pulse ${heights[i % heights.length]}`}
          />
        ))}
      </div>
    </div>
  );
}
