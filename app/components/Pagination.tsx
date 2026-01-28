"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Если страниц мало, показываем все
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Всегда показываем первую страницу
      pages.push(1);

      if (currentPage <= 3) {
        // Если мы в начале
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Если мы в конце
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Если мы в середине
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const startItem = totalItems && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : null;
  const endItem = totalItems && itemsPerPage
    ? Math.min(currentPage * itemsPerPage, totalItems)
    : null;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 px-4 py-3">
      {/* Информация о количестве элементов */}
      {totalItems && itemsPerPage && (
        <div className="flex-1 flex justify-between sm:hidden">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Показано {startItem}-{endItem} из {totalItems}
          </span>
        </div>
      )}

      <div className="flex-1 flex items-center justify-between">
        {/* Информация для десктопа */}
        {totalItems && itemsPerPage && (
          <div className="hidden sm:block">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Показано <span className="font-medium">{startItem}</span> -{" "}
              <span className="font-medium">{endItem}</span> из{" "}
              <span className="font-medium">{totalItems}</span>
            </p>
          </div>
        )}

        {/* Кнопки пагинации */}
        <div className="flex items-center gap-1">
          {/* Предыдущая страница */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
              currentPage === 1
                ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Номера страниц */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) => {
              if (page === "...") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
                  >
                    ...
                  </span>
                );
              }

              const pageNumber = page as number;
              const isActive = pageNumber === currentPage;

              return (
                <button
                  key={pageNumber}
                  onClick={() => onPageChange(pageNumber)}
                  className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                    isActive
                      ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>

          {/* Следующая страница */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
              currentPage === totalPages
                ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
