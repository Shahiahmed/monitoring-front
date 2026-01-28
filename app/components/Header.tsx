import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";

export default function Header() {
  return (
    <header className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 fixed top-0 left-0 right-0 z-50 h-16">
      <div className="w-full px-4 h-full flex items-center">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            <svg
              width={43}
              height={43}
              viewBox="0 0 42.1582 43"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              shapeRendering="geometricPrecision"
              className="text-slate-900 dark:text-white"
              style={
                {
                  "--accent": "#2563EB",
                  "--ink": "#0F172A",
                  "--paper": "#FFFFFF",
                  "--outline": "#0F172A",
                } as React.CSSProperties
              }
            >
              {/* base */}
              <path
                d="M42.1572 0.499832H11.6345C5.21926 0.499832 0 5.69961 0 12.0914V36.2158L8.92022 27.3289V12.0914C8.92022 10.6002 10.1379 9.38677 11.6345 9.38677H33.237L42.1572 0.499832Z"
                fill="var(--accent)"
                stroke="var(--outline)"
                strokeWidth={0.9}
                strokeLinejoin="round"
              />
              <path
                d="M33.238 9.387V30.9087C33.238 32.3997 32.0201 33.6131 30.5232 33.6131H15.2285L6.30859 42.5H30.5232C36.939 42.5 42.1582 37.3002 42.1582 30.9087V0.500061L33.238 9.387Z"
                fill="var(--accent)"
                stroke="var(--outline)"
                strokeWidth={0.9}
                strokeLinejoin="round"
              />

              {/* pulse (only this becomes white in dark mode) */}
              <path
                d="M12 25 H16 L18 21 L21 29 L24 18 L26 25 H30"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* status */}
              <circle
                cx={31}
                cy={12}
                r={6}
                fill="var(--paper)"
                stroke="var(--ink)"
                strokeWidth={2}
              />
              <path
                d="M28.5 12.0 L30.4 14.0 L34.0 10.2"
                stroke="var(--ink)"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white font-[family-name:var(--font-geist-sans)]">
              Monitoring
            </h1>
          </div>

          <nav className="flex items-center space-x-4">
            <LanguageToggle />
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}
