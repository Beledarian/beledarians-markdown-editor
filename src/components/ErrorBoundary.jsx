import React from 'react';
import './ErrorBoundary.css';

/**
 * Error Boundary component to catch and handle errors in child components
 * Prevents the entire app from crashing when a single component fails
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // Fallback UI when error occurs
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <main
                    className="workspace-shell error-boundary"
                    data-style="workbench"
                    data-color-mode="dark"
                    role="alert"
                    aria-live="assertive"
                >
                    <section className="error-boundary__panel">
                    <p className="error-boundary__eyebrow">Workspace recovery</p>
                    <h1>Markdown workspace could not render</h1>
                    <p className="error-boundary__message">
                        {this.props.componentName || 'A component'} failed to load.
                    </p>
                    {this.state.error && (
                        <pre className="error-boundary__details">
                            {this.state.error.toString()}
                        </pre>
                    )}
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="error-boundary__retry"
                    >
                        Retry workspace
                    </button>
                    </section>
                </main>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
