export const SECTION_COLS = 9;
export const SECTION_ROWS = 13;
export const SECTIONS_PER_PAGE = 12;
export const PAGE_GRID_COLS = 3;
export const PAGE_GRID_ROWS = 4;

export function getPaintingStats(gridCols: number, gridRows: number) {
  const sectionCols = Math.ceil(gridCols / SECTION_COLS);
  const sectionRows = Math.ceil(gridRows / SECTION_ROWS);
  const totalSections = sectionCols * sectionRows;
  const totalGridPages = Math.ceil(totalSections / SECTIONS_PER_PAGE);
  const totalPages = 1 + 1 + 1 + totalGridPages + 1;

  return {
    totalCells: gridCols * gridRows,
    totalSections,
    totalPages,
    sectionCols,
    sectionRows,
    totalGridPages,
  };
}
