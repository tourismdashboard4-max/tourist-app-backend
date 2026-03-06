import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ fullScreen = false, size = 'md', message }) => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  const spinnerSize = sizes[size] || sizes.md;

  const Spinner = () => (
    <div className="flex flex-col items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className={`${spinnerSize} border-4 border-green-200 border-t-green-600 rounded-full`}
      />
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-gray-600 dark:text-gray-400"
        >
          {message}
        </motion.p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50">
        <Spinner />
      </div>
    );
  }

  return <Spinner />;
};

export default LoadingSpinner;