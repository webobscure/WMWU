import { useMutation } from "@apollo/client";
import { BookOpen, Import, Library, LogOut, Moon, Search, Sun, Timer, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import type { CurrentUser } from "../../entities/movie/types";
import { CLAIM_MOCK_USER_DATA, COLLECTIONS, SAVED_MOVIES, SMART_COLLECTIONS, WATCHLIST } from "../../shared/graphql/documents";
import styles from "./AppLayout.module.css";

type Props = {
  children: ReactNode;
  user?: CurrentUser | null;
  onLogout?: () => void;
};

function WmwuLogo() {
  return (
    <span className={styles.logo} aria-hidden="true">
      <span className={styles.logoMark}>
        <span className={styles.logoPlay} />
      </span>

      <span className={styles.logoText}>
        WMWU
        <span className={styles.logoPulse} />
      </span>
    </span>
  );
}

export function AppLayout({ children, user, onLogout }: Props) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    return window.localStorage.getItem("theme") === "dark" ? "dark" : "light";
  });
  const [claimMockUserData, claimState] = useMutation(CLAIM_MOCK_USER_DATA, {
    refetchQueries: [COLLECTIONS, WATCHLIST, SAVED_MOVIES, SMART_COLLECTIONS]
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className="container">
          <nav className={styles.nav} aria-label="Основная навигация">
            <NavLink
              to="/"
              className={styles.brand}
              aria-label="Watch Movie With Us"
              title="Watch Movie With Us"
            >
              <WmwuLogo />
            </NavLink>

            <div className={styles.links}>
              <NavLink
                to="/"
                className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
              >
                <Search size={18} aria-hidden />
                Поиск
              </NavLink>

              <NavLink
                to="/library"
                className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
              >
                <BookOpen size={18} aria-hidden />
                Библиотека
              </NavLink>

              <NavLink
                to="/watchlist"
                className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
              >
                <Timer size={18} aria-hidden />
                Хочу посмотреть
              </NavLink>

              <NavLink
                to="/collections"
                className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
              >
                <Library size={18} aria-hidden />
                Коллекции
              </NavLink>

              <button
                className={styles.themeButton}
                type="button"
                onClick={() => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))}
                aria-label={theme === "dark" ? "Включить светлую тему" : "Включить темную тему"}
                title={theme === "dark" ? "Светлая тема" : "Темная тема"}
              >
                {theme === "dark" ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
              </button>

              {user ? (
                <div className={styles.account}>
                  <span className={styles.userPill} title={user.email}>
                    <UserRound size={17} aria-hidden />
                    {user.name}
                  </span>
                  <button
                    className={styles.themeButton}
                    type="button"
                    disabled={claimState.loading}
                    onClick={() => claimMockUserData()}
                    aria-label="Перенести данные mock-пользователя"
                    title="Перенести mock-данные"
                  >
                    <Import size={18} aria-hidden />
                  </button>
                  {onLogout ? (
                    <button
                      className={styles.themeButton}
                      type="button"
                      onClick={onLogout}
                      aria-label="Выйти"
                      title="Выйти"
                    >
                      <LogOut size={18} aria-hidden />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </nav>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
