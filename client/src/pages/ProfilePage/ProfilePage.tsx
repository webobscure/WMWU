import { useMutation, useQuery } from "@apollo/client";
import { ArrowUpRight, BookOpen, CalendarDays, Check, Film, MessageSquare, Pencil, Sparkles, Star, X } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ReviewCard } from "../../components/ReviewCard/ReviewCard";
import { getMovieTitle, type CurrentUser, type Profile } from "../../entities/movie/types";
import { ME, MY_PROFILE, UPDATE_PROFILE, USER_PROFILE } from "../../shared/graphql/documents";
import styles from "./ProfilePage.module.css";

function ProfileForm({ profile, onComplete, onCancel }: { profile: Profile; onComplete: () => void; onCancel: () => void }) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [update, { loading, error }] = useMutation(UPDATE_PROFILE, { refetchQueries: [ME, MY_PROFILE, USER_PROFILE], awaitRefetchQueries: true });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { await update({ variables: { input: { name: name.trim(), bio: bio.trim() || null } } }); onComplete(); }
    catch { /* Keep the draft and display the mutation error. */ }
  }
  return <form className={styles.form} onSubmit={submit}>
    <h2>Редактировать профиль</h2>
    <label>Имя<input className="field" value={name} maxLength={60} required autoComplete="name" onChange={(event) => setName(event.target.value)} /></label>
    <label>О себе<textarea className="textarea" value={bio} maxLength={500} onChange={(event) => setBio(event.target.value)} placeholder="Любимые жанры, режиссёры или просто пара слов о себе" /></label>
    <span className={styles.counter}>{bio.length} / 500</span>
    {error ? <p className={styles.error} role="alert">{error.message}</p> : null}
    <div className={styles.formActions}><button className="buttonPrimary" type="submit" disabled={loading || !name.trim()}>{loading ? "Сохраняем…" : "Сохранить"}</button><button className="buttonSecondary" type="button" disabled={loading} onClick={onCancel}><X size={16} aria-hidden /> Отмена</button></div>
  </form>;
}

export function ProfilePage({ currentUser }: { currentUser: CurrentUser }) {
  const { userId } = useParams();
  const isOwn = !userId || userId === currentUser.id;
  const ownQuery = useQuery<{ myProfile: Profile }>(MY_PROFILE, { skip: !isOwn, fetchPolicy: "cache-and-network" });
  const publicQuery = useQuery<{ userProfile: Profile | null }>(USER_PROFILE, { variables: { userId: userId ?? "" }, skip: isOwn, fetchPolicy: "cache-and-network" });
  const profile = isOwn ? ownQuery.data?.myProfile : publicQuery.data?.userProfile;
  const { loading, error, refetch } = isOwn ? ownQuery : publicQuery;
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!profile) return <section className={styles.page}><div className="container"><div className={styles.state}>{loading ? <p role="status">Загружаем профиль…</p> : <><h1>{error ? "Не удалось загрузить профиль" : "Профиль не найден"}</h1>{error ? <button className="buttonSecondary" type="button" onClick={() => void refetch().catch(() => undefined)}>Повторить</button> : <Link className="buttonSecondary" to="/">К поиску</Link>}</>}</div></div></section>;

  const stats = [
    { label: "Просмотрено", count: profile.stats.watchedCount, icon: Film },
    { label: "Оценок", count: profile.stats.ratedCount, icon: Star },
    { label: "Отзывов", count: profile.stats.reviewCount, icon: MessageSquare },
    { label: "Коллекций", count: profile.stats.collectionsCount, icon: BookOpen }
  ];

  return <section className={styles.page}><div className="container">
    <div className={styles.header}>
      <span className={styles.avatar} aria-hidden>{profile.name.slice(0,1).toUpperCase()}</span>
      <div className={styles.identity}><span className={styles.eyebrow}>{isOwn ? "МОЙ КИНОПРОФИЛЬ" : "ЗРИТЕЛЬ WMWU"}</span><h1>{profile.name}</h1><p>{profile.bio || (isOwn ? "Расскажите немного о себе и своём вкусе в кино." : "Любит хорошие истории и делится впечатлениями.")}</p><span className={styles.joined}><CalendarDays size={14} aria-hidden /> С нами с {new Date(profile.createdAt).toLocaleDateString("ru-RU",{month:"long",year:"numeric"})}</span></div>
      {isOwn ? <button className="buttonSecondary" type="button" onClick={() => { setEditing((value) => !value); setSaved(false); }}><Pencil size={16} aria-hidden /> Редактировать</button> : null}
    </div>
    {saved ? <p className={styles.success} role="status"><Check size={16} aria-hidden /> Профиль обновлён.</p> : null}
    {editing && isOwn ? <ProfileForm profile={profile} onCancel={() => setEditing(false)} onComplete={() => { setEditing(false); setSaved(true); }} /> : null}
    <div className={styles.stats}>{stats.map(({label,count,icon:Icon}) => <div key={label}><Icon size={18} aria-hidden /><strong>{count}</strong><span>{label}</span></div>)}</div>
    {isOwn ? <div className={styles.personal}>
      <div className={styles.taste}><span><Sparkles size={16} aria-hidden /> ВАШ ВКУС В КИНО</span><h2>{profile.favoriteGenres.length ? "Истории, которые вам близки" : "У каждого свой любимый жанр"}</h2>{profile.favoriteGenres.length ? <div className={styles.genres}>{profile.favoriteGenres.map((genre) => <span key={genre}>{genre}</span>)}</div> : <p>Оцените любимые фильмы, и здесь появятся ваши предпочтения.</p>}<Link to="/recommendations">Посмотреть рекомендации <ArrowUpRight size={16} aria-hidden /></Link></div>
      <div className={styles.ratings}><div className={styles.sectionHeading}><h2>Последние оценки</h2><Link to="/library">Библиотека <ArrowUpRight size={14} aria-hidden /></Link></div>{profile.recentRatings.length ? profile.recentRatings.map((entry) => <Link className={styles.ratingRow} key={entry.id} to={`/movies/${encodeURIComponent(entry.movie.externalId)}`}><span>{getMovieTitle(entry.movie)}<small>{entry.movie.year ?? ""}</small></span><strong><Star size={13} aria-hidden /> {entry.personalRating}/10</strong></Link>) : <p className={styles.muted}>Поставьте первую оценку в библиотеке или напишите отзыв на странице фильма.</p>}</div>
    </div> : null}
    <div className={styles.sectionHeading}><h2>{isOwn ? "Ваши отзывы" : "Отзывы зрителя"}</h2><span>{profile.stats.reviewCount}</span></div>
    <div className={styles.reviewGrid}>{profile.reviews.map((review) => <ReviewCard key={review.id} review={review} showMovie />)}</div>
    {!profile.reviews.length ? <div className={styles.state}><MessageSquare size={26} aria-hidden /><h2>Пока нет опубликованных отзывов</h2><p>{isOwn ? "Откройте фильм и поделитесь впечатлениями с другими зрителями." : "Здесь появятся впечатления зрителя о просмотренном кино."}</p>{isOwn ? <Link className="buttonPrimary" to="/">Найти фильм</Link> : null}</div> : null}
    {profile.stats.reviewCount > profile.reviews.length ? <p className={styles.muted}>Показаны последние {profile.reviews.length} отзывов.</p> : null}
  </div></section>;
}
