import Link from "next/link";

interface LinkItem {
  href: string;
  label: string;
}

export function InternalLinks({
  title = "関連ページ",
  links,
}: {
  title?: string;
  links: LinkItem[];
}) {
  if (links.length === 0) return null;

  return (
    <nav className="mt-8 rounded-lg border bg-gray-50 p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">{title}</h2>
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-block rounded-full border bg-white px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
