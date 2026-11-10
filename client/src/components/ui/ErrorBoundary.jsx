import { Component } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

/** Catches render errors so one broken widget never blanks the whole dashboard. */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI error', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card" style={{ padding: 24 }} role="alert">
        <div className="row" style={{ marginBottom: 8 }}>
          <FiAlertTriangle color="var(--danger)" aria-hidden />
          <h2>This section failed to load</h2>
        </div>
        <p className="muted small">{this.state.error.message}</p>
        <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    );
  }
}
