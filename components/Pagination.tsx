import Link from "next/link";

export default function Pagination({
  currentPage,
  totalPages,
  basePath,
  searchParams,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  function hrefForPage(page: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") params.set(key, value);
    }
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="flex items-center justify-center gap-3 mt-10">
      {currentPage > 1 ? (
        <Link href={hrefForPage(currentPage - 1)} className="btn-secondary">
          ← Previous
        </Link>
      ) : (
        <span className="btn-secondary opacity-40 pointer-events-none">← Previous</span>
      )}
      <span className="text-sm text-neutral-500">
        Page {currentPage} of {totalPages}
      </span>
      {currentPage < totalPages ? (
        <Link href={hrefForPage(currentPage + 1)} className="btn-secondary">
          Next →
        </Link>
      ) : (
        <span className="btn-secondary opacity-40 pointer-events-none">Next →</span>
      )}
    </div>
  );
}
