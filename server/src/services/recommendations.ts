export type RatingEntry = {
  userId: string;
  movieId: string;
  personalRating: number | null;
  genres: string[];
};

export type RecommendationScore = {
  movieId: string;
  score: number;
  reason: string;
  mode: "SIMILAR_TASTES" | "GENRES" | "COMMUNITY";
  viewerRating: number;
  ratingCount: number;
};

export function rankRecommendations(ownEntries: RatingEntry[], communityEntries: RatingEntry[]): RecommendationScore[] {
  const validRating = (entry: RatingEntry) => entry.personalRating !== null &&
    Number.isInteger(entry.personalRating) && entry.personalRating >= 1 && entry.personalRating <= 10;
  const ownRatings = new Map(ownEntries.filter(validRating).map((entry) => [entry.movieId, entry.personalRating!]));
  const excluded = new Set(ownEntries.map((entry) => entry.movieId));
  const ownUserId = ownEntries[0]?.userId;
  const ratings = [...new Map(
    communityEntries.filter((entry) => validRating(entry) && entry.userId !== ownUserId)
      .map((entry) => [`${entry.userId}\0${entry.movieId}`, entry])
  ).values()];
  if (!ratings.length) return [];

  const genreWeights = new Map<string, number>();
  for (const entry of ownEntries.filter(validRating)) {
    const weight = entry.personalRating! >= 7 ? entry.personalRating! - 6 : entry.personalRating! <= 4 ? -1 : 0;
    for (const genre of new Set(entry.genres)) genreWeights.set(genre, (genreWeights.get(genre) ?? 0) + weight);
  }
  const maxGenreWeight = Math.max(1, ...genreWeights.values());

  const overlaps = new Map<string, { closeness: number; count: number }>();
  for (const entry of ratings) {
    const ownRating = ownRatings.get(entry.movieId);
    if (ownRating === undefined) continue;
    const overlap = overlaps.get(entry.userId) ?? { closeness: 0, count: 0 };
    overlap.closeness += 1 - Math.abs(ownRating - entry.personalRating!) / 9;
    overlap.count++;
    overlaps.set(entry.userId, overlap);
  }
  const neighbors = new Map<string, number>();
  for (const [userId, overlap] of overlaps) {
    const closeness = overlap.closeness / overlap.count;
    if (overlap.count >= 2 && closeness >= 0.65) {
      neighbors.set(userId, closeness * overlap.count / (overlap.count + 2));
    }
  }

  const globalMean = ratings.reduce((sum, entry) => sum + entry.personalRating!, 0) / ratings.length;
  const candidates = new Map<string, { sum: number; count: number; genres: string[]; weightedSum: number; weight: number }>();
  for (const entry of ratings) {
    if (excluded.has(entry.movieId)) continue;
    const candidate = candidates.get(entry.movieId) ?? { sum: 0, count: 0, genres: entry.genres, weightedSum: 0, weight: 0 };
    candidate.sum += entry.personalRating!;
    candidate.count++;
    const similarity = neighbors.get(entry.userId) ?? 0;
    if (entry.personalRating! >= 7 && similarity > 0) {
      candidate.weightedSum += similarity * entry.personalRating!;
      candidate.weight += similarity;
    }
    candidates.set(entry.movieId, candidate);
  }

  return [...candidates].filter(([, candidate]) => candidate.sum / candidate.count >= 6 || candidate.weight > 0).map(([movieId, candidate]): RecommendationScore => {
    const viewerRating = candidate.sum / candidate.count;
    const communityScore = Math.max(1, (candidate.sum + 5 * globalMean) / (candidate.count + 5) - 1.5 / Math.sqrt(candidate.count));
    const matchedGenres = candidate.genres.filter((genre) => (genreWeights.get(genre) ?? 0) > 0);
    const affinity = candidate.genres.length
      ? candidate.genres.reduce((sum, genre) => sum + Math.max(-1, (genreWeights.get(genre) ?? 0) / maxGenreWeight), 0) / candidate.genres.length
      : 0;
    const genreScore = 5 + 5 * affinity;
    const collaborativeScore = candidate.weight > 0 ? candidate.weightedSum / candidate.weight : null;
    const mode = collaborativeScore !== null ? "SIMILAR_TASTES" : matchedGenres.length ? "GENRES" : "COMMUNITY";
    const score = collaborativeScore !== null
      ? collaborativeScore * 0.6 + communityScore * 0.25 + genreScore * 0.15
      : ownRatings.size ? communityScore * 0.8 + genreScore * 0.2 : communityScore;
    const reason = collaborativeScore !== null
      ? `Зрители с похожими оценками поставили этому фильму в среднем ${collaborativeScore.toFixed(1)}/10.`
      : matchedGenres.length
        ? `Среди ваших любимых жанров — ${matchedGenres.slice(0, 2).join(", ")}.`
        : "Рекомендация на основе оценок зрителей.";
    return { movieId, score: Number(score.toFixed(3)), reason, mode, viewerRating: Number(viewerRating.toFixed(1)), ratingCount: candidate.count };
  }).sort((left, right) => right.score - left.score || right.ratingCount - left.ratingCount || left.movieId.localeCompare(right.movieId)).slice(0, 24);
}
