import { useApolloClient, useMutation, useQuery } from "@apollo/client";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/AppLayout/AppLayout";
import type { CurrentUser } from "../entities/movie/types";
import { AuthPage } from "../pages/AuthPage/AuthPage";
import { CollectionPage } from "../pages/CollectionPage/CollectionPage";
import { CollectionsPage } from "../pages/CollectionsPage/CollectionsPage";
import { HomePage } from "../pages/HomePage/HomePage";
import { LibraryPage } from "../pages/LibraryPage/LibraryPage";
import { MoviePage } from "../pages/MoviePage/MoviePage";
import { WatchlistPage } from "../pages/WatchlistPage/WatchlistPage";
import { LOGOUT, ME } from "../shared/graphql/documents";

type MeData = {
  me: CurrentUser | null;
};

export function App() {
  const client = useApolloClient();
  const { data, loading, refetch } = useQuery<MeData>(ME, {
    fetchPolicy: "network-only"
  });
  const [logout] = useMutation(LOGOUT);
  const user = data?.me ?? null;

  async function handleLogout() {
    await logout();
    await client.clearStore();
    await refetch();
  }

  return (
    <AppLayout user={user} onLogout={user ? handleLogout : undefined}>
      {loading ? (
        <section className="container">
          <div style={{ padding: "42px 0" }}>Загружаем аккаунт...</div>
        </section>
      ) : user ? (
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/movies/:movieId" element={<MoviePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/collections/:collectionId" element={<CollectionPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        <AuthPage
          onComplete={async () => {
            await refetch();
          }}
        />
      )}
    </AppLayout>
  );
}
