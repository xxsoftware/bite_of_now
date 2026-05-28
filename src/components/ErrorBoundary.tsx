import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to localStorage for debugging
    const logs = JSON.parse(localStorage.getItem('bon_error_logs') || '[]')
    logs.push({
      time: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })
    localStorage.setItem('bon_error_logs', JSON.stringify(logs.slice(-20)))
  }

  handleReload = () => {
    window.location.reload()
  }

  handleClearCache = () => {
    localStorage.clear()
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-cream grain flex items-center justify-center px-6">
          <div className="text-center max-w-xs">
            <div className="w-20 h-20 bg-blossom/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={36} className="text-blossom-dark" />
            </div>
            <h2 className="font-display text-xl text-charcoal mb-2">应用遇到错误</h2>
            <p className="text-sm text-stone mb-6 leading-relaxed">
              页面加载时出现了问题。你可以尝试刷新页面，或清除缓存后重启。
            </p>
            <div className="space-y-2.5">
              <Button
                className="w-full h-12 rounded-2xl bg-sage text-charcoal"
                onClick={this.handleReload}
              >
                <RotateCcw size={15} className="mr-1.5" />
                刷新页面
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 rounded-2xl"
                onClick={this.handleClearCache}
              >
                清除缓存并重启
              </Button>
            </div>
            {this.state.error && (
              <div className="mt-5 p-3 bg-cream-dark/30 rounded-xl text-left">
                <p className="text-[10px] text-stone font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
