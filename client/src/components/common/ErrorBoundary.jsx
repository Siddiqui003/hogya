import { Component } from 'react';
import styles from './ErrorBoundary.module.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.page}>
          <div className={styles.card}>
            <div className={styles.icon}>⚠️</div>
            <h1 className={styles.title}>Something went wrong</h1>
            <p className={styles.message}>
              An unexpected error occurred. Your data is safe — this is a display issue.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className={styles.detail}>{this.state.error.message}</pre>
            )}
            <div className={styles.actions}>
              <button className={styles.btnPrimary} onClick={this.handleReset}>
                Go to dashboard
              </button>
              <button className={styles.btnSecondary} onClick={() => window.location.reload()}>
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
