"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "./tour/tour.css";
import { TOUR_VERSION, getStepsForPath } from "./tour/tourSteps";

/** Версия тура, который пользователь уже прошёл. */
const DONE_KEY = "sarap.tourCompletedVersion";
/** Флаг «запустить тур сразу после перехода на главную». */
const AUTOSTART_KEY = "sarap.tourAutostart";

interface TourContextValue {
  /** Запустить тур вручную (кнопка «Пройти обучение»). */
  startTour: () => void;
  /** Забыть, что тур пройден — покажется при следующем входе на главную. */
  resetTour: () => void;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

const normalizePath = (p: string) => (p || "/").replace(/\/+$/, "") || "/";

/** Ждём появления элемента — данные на дашборде приходят асинхронно. */
function waitForSelector(selector: string, timeout = 8000): Promise<Element | null> {
  return new Promise((resolve) => {
    const found = document.querySelector(selector);
    if (found) {
      resolve(found);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      const el = document.querySelector(selector);
      if (el || Date.now() - started > timeout) {
        window.clearInterval(timer);
        resolve(el);
      }
    }, 120);
  });
}

export function TourProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const driverRef = useRef<Driver | null>(null);
  const unmountedRef = useRef(false);

  const markCompleted = useCallback(() => {
    try {
      localStorage.setItem(DONE_KEY, TOUR_VERSION);
    } catch {
      // localStorage может быть недоступен — не критично
    }
  }, []);

  const run = useCallback(
    async (path: string) => {
      if (driverRef.current) return;

      const allSteps = getStepsForPath(path);

      // Дожидаемся каркаса страницы и — на дашборде — загруженных графиков
      const firstAnchor = allSteps.find((s) => typeof s.element === "string")?.element;
      if (typeof firstAnchor === "string") await waitForSelector(firstAnchor);
      if (path === "/") await waitForSelector('[data-tour="dashboard-charts"]', 6000);

      if (unmountedRef.current || driverRef.current) return;

      // Часть блоков видна не всем (админские разделы, сертификаты) — такие шаги пропускаем
      const steps: DriveStep[] = allSteps.filter(
        (s) => typeof s.element !== "string" || document.querySelector(s.element) !== null,
      );
      if (steps.length === 0) return;

      const instance = driver({
        steps,
        showProgress: true,
        progressText: "{{current}} из {{total}}",
        nextBtnText: "Далее",
        prevBtnText: "Назад",
        doneBtnText: "Готово",
        popoverClass: "sarap-tour",
        overlayColor: "#0f172a",
        overlayOpacity: 0.6,
        // 8px даёт запас, в который целиком укладывается кольцо подсветки из tour.css
        stagePadding: 8,
        stageRadius: 12,
        smoothScroll: true,
        allowClose: true,
        onDestroyed: () => {
          driverRef.current = null;
          markCompleted();
        },
      });

      driverRef.current = instance;
      instance.drive();
    },
    [markCompleted],
  );

  const startTour = useCallback(() => {
    const path = normalizePath(pathname);
    if (path === "/") {
      void run(path);
      return;
    }
    // Полный тур живёт на главной — переходим туда и запускаем после навигации
    try {
      sessionStorage.setItem(AUTOSTART_KEY, "1");
    } catch {
      // если sessionStorage недоступен — просто перейдём на главную
    }
    router.push("/");
  }, [pathname, router, run]);

  const resetTour = useCallback(() => {
    try {
      localStorage.removeItem(DONE_KEY);
    } catch {
      // не критично
    }
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, []);

  useEffect(() => {
    const path = normalizePath(pathname);

    let autostart = false;
    try {
      autostart = sessionStorage.getItem(AUTOSTART_KEY) === "1";
      if (autostart) sessionStorage.removeItem(AUTOSTART_KEY);
    } catch {
      autostart = false;
    }

    if (autostart) {
      void run(path);
      return;
    }

    // Автопоказ — только при первом заходе на главную
    if (path !== "/") return;
    let completed: string | null = null;
    try {
      completed = localStorage.getItem(DONE_KEY);
    } catch {
      completed = TOUR_VERSION; // нет доступа к хранилищу — не навязываем тур
    }
    if (completed === TOUR_VERSION) return;

    void run(path);
  }, [pathname, run]);

  return (
    <TourContext.Provider value={{ startTour, resetTour }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}
