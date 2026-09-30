import type { DriveStep } from "driver.js";

/**
 * Версия тура. Увеличивай, когда интерфейс заметно поменялся —
 * тогда тур снова покажется всем, кто его уже проходил.
 */
export const TOUR_VERSION = "1";

/** Событие, по которому Sidebar разворачивается перед шагом тура. */
export const EXPAND_SIDEBAR_EVENT = "sarap:tour-expand-sidebar";

function expandSidebar() {
  window.dispatchEvent(new CustomEvent(EXPAND_SIDEBAR_EVENT));
}

/** Шаги общей части интерфейса — шапка, меню, ИИ-ассистент. */
const shellSteps: DriveStep[] = [
  {
    popover: {
      title: "Добро пожаловать в SARAP",
      description:
        "Это система мониторинга и аналитики. За минуту покажем, где что находится. Тур можно закрыть в любой момент — клавишей Esc или крестиком.",
    },
  },
  {
    element: '[data-tour="header-brand"]',
    popover: {
      title: "Шапка системы",
      description:
        "Логотип SARAP всегда возвращает на главную панель — куда бы вы ни ушли по разделам.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="cert-badges"]',
    popover: {
      title: "Сертификаты ЭЦП и SSL",
      description:
        "Здесь виден срок действия сертификатов. Когда до истечения остаётся мало дней — это первое, что вы заметите при входе.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-tour="header-tools"]',
    popover: {
      title: "Язык, тема и профиль",
      description:
        "Переключение русский / қазақша, светлая и тёмная тема, а также вход в личный профиль — смена пароля и данных учётной записи.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: "Главное меню",
      description:
        "Все разделы системы: серверы, инциденты, сервисы, справочники и настройки. Пункты со стрелкой раскрывают вложенные страницы.",
      side: "right",
      align: "start",
    },
    onHighlightStarted: () => expandSidebar(),
  },
  {
    element: '[data-tour="sidebar-toggle"]',
    popover: {
      title: "Свернуть меню",
      description:
        "Этой кнопкой меню сворачивается до иконок — удобно, когда нужно больше места под таблицы и графики. Выбор запоминается.",
      side: "right",
      align: "center",
    },
  },
  {
    element: '[data-tour="sidebar-logout"]',
    popover: {
      title: "Выход из системы",
      description:
        "Завершает сеанс и возвращает на страницу входа. Всегда внизу меню.",
      side: "right",
      align: "end",
    },
  },
];

const dashboardSteps: DriveStep[] = [
  {
    element: '[data-tour="dashboard-stats"]',
    popover: {
      title: "Сводка",
      description:
        "Ключевые показатели за текущий период: серверы, инциденты и доступность. Быстрый ответ на вопрос «всё ли в порядке прямо сейчас».",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="dashboard-charts"]',
    popover: {
      title: "Графики",
      description:
        "Динамика активности и простоев. Наведите курсор на график, чтобы увидеть значения за конкретный период.",
      side: "top",
      align: "center",
    },
  },
];

const outroSteps: DriveStep[] = [
  {
    element: '[data-tour="ai-chat"]',
    popover: {
      title: "ИИ-ассистент",
      description:
        "Задайте вопрос обычным текстом — ассистент поможет разобраться с инцидентами, серверами и статистикой.",
      side: "left",
      align: "end",
    },
  },
  {
    popover: {
      title: "Готово",
      description:
        "Это основное. Тур можно пройти заново в любой момент — кнопка «Пройти обучение» в разделе «Профиль».",
    },
  },
];

/**
 * Шаги для конкретной страницы.
 * Чтобы добавить тур для нового раздела — заведи ещё одну ветку
 * и проставь на страницу атрибуты data-tour="...".
 */
export function getStepsForPath(pathname: string): DriveStep[] {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";

  if (path === "/") {
    return [...shellSteps, ...dashboardSteps, ...outroSteps];
  }

  return [...shellSteps, ...outroSteps];
}
