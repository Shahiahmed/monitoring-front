/** Как на старом failure-statistics: год + квартал → даты для input type="date". */

function quarterBounds(year: number, quarter: 1 | 2 | 3 | 4): { from: string; to: string } {
  const m: Record<1 | 2 | 3 | 4, [string, string]> = {
    1: [`${year}-01-01`, `${year}-03-31`],
    2: [`${year}-04-01`, `${year}-06-30`],
    3: [`${year}-07-01`, `${year}-09-30`],
    4: [`${year}-10-01`, `${year}-12-31`],
  };
  const [from, to] = m[quarter];
  return { from, to };
}

/**
 * @param yearStr пусто — «не выбрано»
 * @param quarterStr пусто — весь выбранный год; иначе 1–4
 * @returns null — сбросить даты (весь период / как у API без фильтра)
 */
export function datesFromYearQuarter(yearStr: string, quarterStr: string): { from: string; to: string } | null {
  if (!yearStr && !quarterStr) {
    return null;
  }

  let y: number;
  if (yearStr) {
    y = parseInt(yearStr, 10);
    if (Number.isNaN(y)) return null;
  } else {
    y = new Date().getFullYear();
  }

  if (!quarterStr) {
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }

  const q = parseInt(quarterStr, 10);
  if (q < 1 || q > 4) {
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  return quarterBounds(y, q as 1 | 2 | 3 | 4);
}
