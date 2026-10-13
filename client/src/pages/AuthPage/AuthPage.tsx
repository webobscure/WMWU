import { useMutation } from "@apollo/client";
import { BookOpen, Film, LockKeyhole, LogIn, Timer, UserPlus } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { LOGIN, ME, REGISTER_USER } from "../../shared/graphql/documents";
import styles from "./AuthPage.module.css";

type Mode = "login" | "register";

type Props = {
  onComplete: () => Promise<void> | void;
};

export function AuthPage({ onComplete }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, loginState] = useMutation(LOGIN, { refetchQueries: [ME] });
  const [register, registerState] = useMutation(REGISTER_USER, { refetchQueries: [ME] });
  const loading = loginState.loading || registerState.loading;
  const error = loginState.error || registerState.error;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "register") {
      await register({
        variables: {
          input: {
            name,
            email,
            password
          }
        }
      });
    } else {
      await login({
        variables: {
          input: {
            email,
            password
          }
        }
      });
    }

    await onComplete();
  }

  return (
    <section className={styles.page}>
      <div className="container">
        <div className={styles.authGrid}>
          <div className={styles.copy}>
            <span>
              <Film size={18} aria-hidden />
              WMWU
            </span>
            <h1>Все ваши фильмы.<br /><em>В одной истории.</em></h1>
            <p>Для тех, кто любит кино. Сохраняйте находки, собирайте коллекции и помните каждую хорошую историю.</p>
            <div className={styles.features}>
              <div><BookOpen size={20} aria-hidden /><span><strong>Личная библиотека</strong><small>Любимое кино всегда под рукой</small></span></div>
              <div><Timer size={20} aria-hidden /><span><strong>Планы на вечер</strong><small>Всё, что хочется посмотреть</small></span></div>
              <div><Film size={20} aria-hidden /><span><strong>Ваши коллекции</strong><small>Истории, объединённые настроением</small></span></div>
            </div>
            <div className={styles.ticket} aria-hidden="true"><span>WMWU<small>WATCH MOVIE WITH US</small></span><span>Место для<br /><em>вашего кино.</em></span><Film size={28} /></div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formHeading}>
              <span className={styles.formIcon}><Film size={22} aria-hidden /></span>
              <h2>{mode === "login" ? "С возвращением" : "Начнём вашу историю"}</h2>
              <p>{mode === "login" ? "Ваше кино уже ждёт вас." : "Создайте своё пространство для кино."}</p>
            </div>
            <div className={styles.tabs} role="group" aria-label="Режим авторизации">
              <button
                className={mode === "login" ? styles.activeTab : styles.tab}
                type="button"
                aria-pressed={mode === "login"}
                onClick={() => setMode("login")}
              >
                <LogIn size={17} aria-hidden />
                Вход
              </button>
              <button
                className={mode === "register" ? styles.activeTab : styles.tab}
                type="button"
                aria-pressed={mode === "register"}
                onClick={() => setMode("register")}
              >
                <UserPlus size={17} aria-hidden />
                Регистрация
              </button>
            </div>

            {mode === "register" ? (
              <label>
                <span>Имя</span>
                <input className="field" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Как вас зовут?" required />
              </label>
            ) : null}

            <label>
              <span>Email</span>
              <input
                className="field"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label>
              <span>Пароль</span>
              <input
                className="field"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="Не менее 8 символов"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error ? <p className={styles.error}>{error.message}</p> : null}

            <button className="buttonPrimary" type="submit" disabled={loading}>
              {loading ? "Подождите…" : mode === "register" ? "Создать аккаунт" : "Войти"}
            </button>
            <p className={styles.privacy}><LockKeyhole size={13} aria-hidden /> Ваши коллекции в вашем аккаунте</p>
          </form>
        </div>
      </div>
    </section>
  );
}
