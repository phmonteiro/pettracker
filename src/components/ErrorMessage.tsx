import { AlertCircle, XCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface ErrorMessageProps {
  type?: 'error' | 'warning' | 'success' | 'info';
  title?: string;
  message: string;
  details?: string[];
  onDismiss?: () => void;
}

function ErrorMessage({
  type = 'error',
  title,
  message,
  details,
  onDismiss,
}: ErrorMessageProps) {
  const config = {
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-400',
      iconColor: 'text-red-400',
      titleColor: 'text-red-800',
      textColor: 'text-red-700',
      defaultTitle: 'Erro',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-400',
      iconColor: 'text-yellow-400',
      titleColor: 'text-yellow-800',
      textColor: 'text-yellow-700',
      defaultTitle: 'Aviso',
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-400',
      iconColor: 'text-green-400',
      titleColor: 'text-green-800',
      textColor: 'text-green-700',
      defaultTitle: 'Sucesso',
    },
    info: {
      icon: AlertCircle,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-400',
      iconColor: 'text-blue-400',
      titleColor: 'text-blue-800',
      textColor: 'text-red-700',
      defaultTitle: 'Informação',
    },
  };

  const { icon: Icon, bgColor, borderColor, iconColor, titleColor, textColor, defaultTitle } =
    config[type];

  return (
    <div className={`rounded-md ${bgColor} border-l-4 ${borderColor} p-4`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${titleColor}`}>{title || defaultTitle}</h3>
          <div className={`mt-2 text-sm ${textColor}`}>
            <p>{message}</p>
            {details && details.length > 0 && (
              <ul className="list-disc list-inside mt-2 space-y-1">
                {details.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={onDismiss}
                className={`inline-flex rounded-md p-1.5 ${textColor} hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2`}
              >
                <span className="sr-only">Dispensar</span>
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorMessage;
