import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('App error:', error, info);
  }

  handleReset = (): void => {
    try {
      localStorage.removeItem('family-budget-v2');
      localStorage.removeItem('family-planner-tasks');
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="error-fallback">
          <h1>Не удалось загрузить приложение</h1>
          <p>{this.state.error.message}</p>
          <button type="button" className="btn btn--primary" onClick={this.handleReset}>
            Сбросить данные и перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
