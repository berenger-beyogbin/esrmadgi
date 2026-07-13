import React from 'react';

interface Props {
  children: React.ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  // Explicit member declarations required because @types/react is absent
  declare state: State;
  declare props: Readonly<Props>;
  declare setState: (state: Partial<State>) => void;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl max-w-3xl mx-auto mt-6">
          <p className="text-rose-800 font-bold text-base mb-2">
            {this.props.fallbackLabel ?? 'Une erreur est survenue dans ce composant.'}
          </p>
          <pre className="text-xs text-rose-700 bg-rose-100 rounded-xl p-4 overflow-auto whitespace-pre-wrap">
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-500 transition"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
