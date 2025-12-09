'use client';

import { AlertCircle, RefreshCw, WifiOff, ServerCrash, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  error: Error | null;
  onRetry?: () => void;
  title?: string;
  description?: string;
}

type ErrorType = 'network' | 'server' | 'timeout' | 'notFound' | 'unknown';

function getErrorType(error: Error | null): ErrorType {
  if (!error) return 'unknown';
  
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'network';
  }
  if (message.includes('500') || message.includes('server')) {
    return 'server';
  }
  if (message.includes('timeout') || message.includes('aborted')) {
    return 'timeout';
  }
  if (message.includes('404') || message.includes('not found')) {
    return 'notFound';
  }
  
  return 'unknown';
}

const errorConfig: Record<ErrorType, { icon: typeof AlertCircle; title: string; description: string; color: string }> = {
  network: {
    icon: WifiOff,
    title: 'Connection Error',
    description: 'Unable to connect to the server. Please check your internet connection and try again.',
    color: 'text-amber-500',
  },
  server: {
    icon: ServerCrash,
    title: 'Server Error',
    description: 'Something went wrong on our end. Our team has been notified. Please try again later.',
    color: 'text-red-500',
  },
  timeout: {
    icon: Clock,
    title: 'Request Timeout',
    description: 'The request took too long to complete. This might be due to a large dataset. Try selecting fewer fields.',
    color: 'text-orange-500',
  },
  notFound: {
    icon: AlertCircle,
    title: 'Data Not Found',
    description: 'No data found for the selected query. Try adjusting your filters or selecting different fields.',
    color: 'text-slate-500',
  },
  unknown: {
    icon: AlertCircle,
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again.',
    color: 'text-red-500',
  },
};

export function DashboardErrorState({ error, onRetry, title, description }: ErrorStateProps) {
  const errorType = getErrorType(error);
  const config = errorConfig[errorType];
  const Icon = config.icon;

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className={`w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6`}>
          <Icon className={`w-8 h-8 ${config.color}`} />
        </div>
        
        <h3 className="text-xl font-semibold text-slate-800 mb-2">
          {title || config.title}
        </h3>
        
        <p className="text-slate-500 mb-6">
          {description || config.description}
        </p>

        {/* Show actual error in dev mode */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-left">
            <p className="text-xs font-mono text-red-600 break-all">
              {error.message}
            </p>
          </div>
        )}

        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}

export function DashboardEmptyState({ 
  title = "No data available",
  description = "Select fields from the Query Builder to visualize your data.",
  icon: Icon = AlertCircle,
}: {
  title?: string;
  description?: string;
  icon?: typeof AlertCircle;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mx-auto mb-6">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
        
        <h3 className="text-xl font-semibold text-slate-800 mb-2">
          {title}
        </h3>
        
        <p className="text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}
