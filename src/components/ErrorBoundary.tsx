import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fade-in flex flex-col items-center justify-center gap-4" style={{ padding: '40px 20px', textAlign: 'center', minHeight: '300px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(var(--accent-rose-rgb), 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <AlertTriangle size={28} color="var(--accent-rose)" />
          </div>
          <h3 className="title-medium">Algo sali&oacute; mal</h3>
          <p className="body-standard" style={{ maxWidth: '280px', fontSize: '12px' }}>
            Hubo un error inesperado. Puedes intentar recargar la secci&oacute;n.
          </p>
          <button onClick={this.handleReset} className="btn-primary" style={{ maxWidth: '200px', padding: '12px', borderRadius: '16px' }}>
            <RefreshCw size={14} />
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
