import { useMutation } from "@apollo/client";
import { Film, LogIn, UserPlus } from "lucide-react";
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
            <h1>Ваши коллекции, watchlist и прогресс в одном аккаунте</h1>
            <p>После входа фильмы будут сохраняться в персональные коллекции и библиотеку текущего пользователя.</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.tabs} role="tablist" aria-label="Режим авторизации">
              <button
                className={mode === "login" ? styles.activeTab : styles.tab}
                type="button"
                onClick={() => setMode("login")}
              >
                <LogIn size={17} aria-hidden />
                Вход
              </button>
              <button
                className={mode === "register" ? styles.activeTab : styles.tab}
                type="button"
                onClick={() => setMode("register")}
              >
                <UserPlus size={17} aria-hidden />
                Регистрация
              </button>
            </div>

            {mode === "register" ? (
              <label>
                <span>Имя</span>
                <input className="field" value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
            ) : null}

            <label>
              <span>Email</span>
              <input
                className="field"
                type="email"
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
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error ? <p className={styles.error}>{error.message}</p> : null}

            <button className="buttonPrimary" type="submit" disabled={loading}>
              {mode === "register" ? "Создать аккаунт" : "Войти"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
