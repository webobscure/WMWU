import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Layout } from './components/Layout';
import { PlannedCalendar } from './components/PlannedCalendar';
import { PriceCompare } from './components/PriceCompare';
import { ShoppingList } from './components/ShoppingList';
import { useAppState } from './hooks/useAppState';
import type { ViewId } from './types';
import './App.css';

function App() {
  const [view, setView] = useState<ViewId>('dashboard');
  const {
    state,
    updateSettings,
    addComparison,
    removeComparison,
    addOffer,
    removeOffer,
    addShoppingItem,
    updateShoppingItem,
    removeShoppingItem,
    addToListFromComparison,
    resetAll,
  } = useAppState();

  return (
    <Layout view={view} onViewChange={setView}>
      {view === 'dashboard' && (
        <Dashboard
          state={state}
          onUpdateBudget={(monthlyBudget) => updateSettings({ monthlyBudget })}
          onGoCompare={() => setView('compare')}
        />
      )}

      {view === 'compare' && (
        <PriceCompare
          state={state}
          onAddComparison={addComparison}
          onRemoveComparison={removeComparison}
          onAddOffer={addOffer}
          onRemoveOffer={removeOffer}
          onAddToList={addToListFromComparison}
        />
      )}

      {view === 'list' && (
        <ShoppingList
          state={state}
          onAdd={addShoppingItem}
          onUpdate={updateShoppingItem}
          onRemove={removeShoppingItem}
        />
      )}

      {view === 'calendar' && <PlannedCalendar state={state} />}

      <footer className="footer">
        <button type="button" className="btn btn--ghost btn--sm" onClick={resetAll}>
          Сбросить все данные
        </button>
      </footer>
    </Layout>
  );
}

export default App;
