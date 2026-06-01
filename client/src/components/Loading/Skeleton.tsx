import styles from "./Skeleton.module.css";

type Props = {
  count?: number;
};

export function MovieCardSkeletons({ count = 6 }: Props) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div className={styles.card} key={index} aria-hidden>
          <div className={styles.poster} />
          <div className={styles.lineWide} />
          <div className={styles.line} />
          <div className={styles.actions}>
            <div />
            <div />
          </div>
        </div>
      ))}
    </>
  );
}
