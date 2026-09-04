import Link from "next/link";
import type { Banner as BannerType } from "@/lib/content";

export default function Banner({ banner }: { banner: BannerType }) {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-10 lg:px-14">
      <div className="grid overflow-hidden rounded-3xl border border-border md:grid-cols-2">
        <div className="flex flex-col justify-center gap-5 p-10 lg:p-14">
          <span className="inline-flex w-fit items-center rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-ink">
            {banner.tag}
          </span>
          <h1 className="font-heading text-3xl font-bold leading-tight lg:text-4xl">
            {banner.title}
          </h1>
          <p className="max-w-md text-sm text-text-muted">{banner.description}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/catalog"
              className="rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white"
            >
              {banner.primaryCta}
            </Link>
            <Link
              href="/how-to-order"
              className="rounded-xl border border-border px-6 py-3.5 text-sm font-semibold"
            >
              {banner.secondaryCta}
            </Link>
          </div>
        </div>

        <div className="relative min-h-[280px] bg-gradient-to-br from-accent-soft to-accent">
          {banner.mediaUrl ? (
            banner.mediaType === "video" ? (
              <video
                src={banner.mediaUrl}
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={banner.mediaUrl}
                alt={banner.title}
                className="h-full w-full object-cover"
              />
            )
          ) : (
            <div className="p-10">
              <div className="absolute left-[18%] top-[22%] h-40 w-32 -rotate-6 rounded-2xl bg-white/90 shadow-xl" />
              <div className="absolute left-[42%] top-[36%] h-40 w-32 rotate-3 rounded-2xl bg-white shadow-xl" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
