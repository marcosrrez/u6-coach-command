import { Component } from 'react'
import { RotateCcw } from 'lucide-react'

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary]', error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
                    <div className="glass-card-solid p-8 max-w-sm text-center space-y-4">
                        <p className="text-4xl">😵</p>
                        <h2 className="font-display font-bold text-xl text-slate-100">Something went wrong</h2>
                        <p className="text-sm text-slate-400">
                            The app ran into an unexpected error. This usually fixes itself with a reload.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="flex items-center gap-2 mx-auto gradient-emerald text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity active:scale-95"
                        >
                            <RotateCcw size={14} /> Reload App
                        </button>
                        {this.state.error && (
                            <p className="text-[10px] text-slate-600 font-mono break-all mt-2">
                                {this.state.error.message}
                            </p>
                        )}
                    </div>
                </div>
            )
        }
        return this.props.children
    }
}
