import { BookOpen, Library, LogOut, Moon, Search, Sun, Sparkles, Timer, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import type { CurrentUser } from "../../entities/movie/types";
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
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">Перейти к содержимому</a>
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
              {user ? (
                <div className={styles.navigation} aria-label="Разделы">
                  <NavLink
                    to="/"
                    end
                    className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
                  >
                    <Search size={18} aria-hidden />
                    <span>Поиск</span>
                  </NavLink>

                  <NavLink to="/recommendations" className={({ isActive }) => `${styles.recommendationsLink} ${isActive ? styles.activeLink : styles.link}`}>
                    <Sparkles size={18} aria-hidden /><span>Для вас</span>
                  </NavLink>

                  <NavLink
                    to="/library"
                    className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
                  >
                    <BookOpen size={18} aria-hidden />
                    <span>Библиотека</span>
                  </NavLink>

                  <NavLink
                    to="/watchlist"
                    aria-label="Хочу посмотреть"
                    className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
                  >
                    <Timer size={18} aria-hidden />
                    <span className={styles.watchlistLabel}>Хочу посмотреть</span>
                    <span className={styles.mobileWatchlistLabel} aria-hidden>Позже</span>
                  </NavLink>

                  <NavLink
                    to="/collections"
                    className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
                  >
                    <Library size={18} aria-hidden />
                    <span>Коллекции</span>
                  </NavLink>
                  <NavLink to="/profile" className={({ isActive }) => `${styles.mobileProfileLink} ${isActive ? styles.activeLink : styles.link}`}>
                    <UserRound size={18} aria-hidden /><span>Профиль</span>
                  </NavLink>
                </div>
              ) : null}
              <div className={styles.controls}>
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
                    <NavLink to="/profile" className={styles.userPill} aria-label="Мой профиль" title="Мой профиль">
                      <UserRound size={17} aria-hidden />
                      <span>{user.name}</span>
                    </NavLink>
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
            </div>
          </nav>
        </div>
      </header>

      <main id="main-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>
      <footer className={user ? styles.footer : `${styles.footer} ${styles.guestFooter}`}>
        <div className="container">
          <span>WMWU <span className={styles.footerDot}>·</span> Watch Movie With Us</span>
          <span>Хорошее кино остаётся с вами.</span>
        </div>
      </footer>
    </div>
  );
}
