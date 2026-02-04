'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
}

export default class ModuleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`Module error (${this.props.moduleName || 'unknown'}):`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card p-6 text-center border border-space-600/50">
          <span className="text-3xl block mb-3">&#x26A0;&#xFE0F;</span>
          <h3 className="text-lg font-semibold text-white mb-1">
            Module Failed to Load
          </h3>
          <p className="text-star-300 text-sm mb-3">
            {this.props.moduleName ? `The ${this.props.moduleName} module` : 'This module'} encountered an error.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="btn-secondary text-sm py-1.5 px-4"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
