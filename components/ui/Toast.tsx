import React, { useEffect } from 'react';
import { useStore, Notification } from '../../store';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastItem: React.FC<{ notification: Notification }> = ({ notification }) => {
  const { removeNotification } = useStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      removeNotification(notification.id);
    }, 5000); // Auto close after 5s

    return () => clearTimeout(timer);
  }, [notification.id, removeNotification]);

  const icons = {
    success: <CheckCircle size={20} className="text-green-500 shrink-0" />,
    error: <AlertCircle size={20} className="text-red-500 shrink-0" />,
    info: <Info size={20} className="text-blue-500 shrink-0" />
  };

  const borders = {
    success: 'border-l-green-500',
    error: 'border-l-red-500',
    info: 'border-l-blue-500'
  };

  return (
    <div className={`flex items-center gap-3 w-full md:w-80 bg-white p-4 rounded-lg shadow-lg border border-slate-100 border-l-4 ${borders[notification.type]} animate-in slide-in-from-bottom md:slide-in-from-right duration-300`}>
      {icons[notification.type]}
      <p className="flex-1 text-sm text-slate-700 font-medium break-words">{notification.message}</p>
      <button onClick={() => removeNotification(notification.id)} className="text-slate-400 hover:text-slate-600 shrink-0">
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer = () => {
  const { notifications } = useStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 flex flex-col gap-3 items-center md:items-end">
      {notifications.map(n => (
        <ToastItem key={n.id} notification={n} />
      ))}
    </div>
  );
};
