import React from 'react';
import { Loader } from 'lucide-react';

const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-secondary">
      <Loader className="loading-spinner mb-4" size={32} />
      {message && <p className="text-sm font-medium">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
