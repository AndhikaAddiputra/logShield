export interface MobilePlaceholderPageProps {
  title: string;
  description?: string;
}

export function MobilePlaceholderPage({
  title,
  description = "Halaman ini akan menyusul.",
}: MobilePlaceholderPageProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 pb-28 pt-12 text-center">
      <h1 className="text-lg font-bold text-ls-navy">{title}</h1>
      <p className="mt-2 text-sm text-ls-muted">{description}</p>
    </main>
  );
}
