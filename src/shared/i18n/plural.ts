const rules: Record<string, Intl.PluralRules> = {};

function select(locale: string, n: number): Intl.LDMLPluralRule {
  rules[locale] ??= new Intl.PluralRules(locale);
  return rules[locale].select(n);
}

/* Russian: one (1, 21), few (2-4, 22-24), many (0, 5-20, ...). */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  switch (select("ru", n)) {
    case "one":
      return one;
    case "few":
      return few;
    default:
      return many;
  }
}

export function pluralEn(n: number, one: string, other: string): string {
  return select("en", n) === "one" ? one : other;
}
