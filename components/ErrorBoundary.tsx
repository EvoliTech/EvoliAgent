import React from 'react';

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<any, any> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <h1 className="text-xl font-bold text-red-700 mb-4">Ops! O sistema encontrou um erro e tentou travar a tela.</h1>
            <p className="text-red-900 font-medium whitespace-pre-wrap">{this.state.error && this.state.error.toString()}</p>
            <p className="text-red-600 mt-2 text-sm italic">Mande um print (foto) desta tela vermelha para continuarmos o conserto do bug!</p>
            <pre className="mt-4 p-4 bg-red-100/50 text-red-800 rounded font-mono text-xs overflow-auto">
              {this.state.errorInfo?.componentStack}
            </pre>
            <button 
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              className="mt-6 bg-red-600 font-bold text-white px-6 py-2 rounded-lg shadow-md hover:bg-red-700 w-full"
            >
              Forçar reinício da página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
