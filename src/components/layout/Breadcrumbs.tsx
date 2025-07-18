import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <div className="text-sm breadcrumbs mb-4">
      <ul className="flex flex-wrap items-center">
        <li>
          <Link href="/" className="text-base-content/70 hover:text-primary transition">
            ホーム
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <span className="mx-2 text-base-content/40">/</span>
            {item.href ? (
              <Link href={item.href} className="text-base-content/70 hover:text-primary transition">
                {item.label}
              </Link>
            ) : (
              <span className="text-base-content font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}