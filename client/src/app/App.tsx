import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/AppLayout/AppLayout";
import { CollectionPage } from "../pages/CollectionPage/CollectionPage";
import { CollectionsPage } from "../pages/CollectionsPage/CollectionsPage";
import { HomePage } from "../pages/HomePage/HomePage";
import { LibraryPage } from "../pages/LibraryPage/LibraryPage";
import { MoviePage } from "../pages/MoviePage/MoviePage";
import { WatchlistPage } from "../pages/WatchlistPage/WatchlistPage";

export function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/movies/:movieId" element={<MoviePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/collections/:collectionId" element={<CollectionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
