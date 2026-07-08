type NullableText = string | null | undefined;

export interface PredictionOwnerDisplayInput {
  source?: NullableText;
  variant?: NullableText;
  slug?: NullableText;
  activeYears?: number[];
  includeSlugFallback?: boolean;
}

function cleanText(value: NullableText): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function formatActiveYears(years: number[] = []): string | null {
  const unique = [...new Set(years)].sort((a, b) => a - b);
  if (unique.length === 0) return null;
  if (unique.length === 1) return `${unique[0]}年`;

  const contiguous = unique.every((year, index) => {
    if (index === 0) return true;
    return year === unique[index - 1] + 1;
  });

  if (contiguous) {
    return `${unique[0]}-${unique[unique.length - 1]}年`;
  }

  return `${unique.join("/")}年`;
}

export function formatPredictionOwnerSubline(
  input: PredictionOwnerDisplayInput,
): string | null {
  const source = cleanText(input.source);
  const variant = cleanText(input.variant);
  const slug = cleanText(input.slug);
  const metadataParts = [source, variant].filter((part): part is string =>
    Boolean(part),
  );
  const parts = [
    ...metadataParts,
    formatActiveYears(input.activeYears ?? []),
  ].filter((part): part is string => Boolean(part));

  if (input.includeSlugFallback && metadataParts.length === 0 && slug) {
    parts.push(slug);
  }

  return parts.length > 0 ? parts.join(" / ") : null;
}
