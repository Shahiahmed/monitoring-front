import Link from "next/link";

export default function Footer() {
  return (
    <footer className="glass mt-auto border-t border-white/40 dark:border-white/10">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center text-slate-600 dark:text-gray-400">
          <div className="flex-1" />
          <p>&copy; {new Date().getFullYear()} Мониторинг. Все права защищены.</p>
          <p className="flex-1 text-right text-[10px] opacity-75">
            <Link href="/changelog" className="hover:underline">
              Журнал изменений
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
