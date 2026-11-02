export function PageHead({ kicker, title, lede, children }: { kicker: string; title: string; lede?: string; children?: React.ReactNode }) {
  return (
    <header className="pb-8 pt-10 md:pb-12 md:pt-16">
      <p className="kicker rise">{kicker}</p>
      <h1 className="display rise mt-3 max-w-4xl text-[2.6rem] font-medium leading-[0.98] md:text-[4.6rem]" style={{ animationDelay: "60ms" }}>
        {title}
      </h1>
      {lede && (
        <p className="rise mt-5 max-w-2xl text-lg leading-relaxed text-ink-2" style={{ animationDelay: "120ms" }}>
          {lede}
        </p>
      )}
      {children}
    </header>
  );
}
