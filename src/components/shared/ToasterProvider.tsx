'use client';
import { Toaster } from 'react-hot-toast';

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1A2B4A',
          color: '#fff',
          fontSize: '13px',
          fontWeight: '500',
          borderRadius: '12px',
          padding: '12px 16px',
        },
        success: {
          iconTheme: { primary: '#1D9E75', secondary: '#fff' },
        },
        error: {
          iconTheme: { primary: '#E24B4A', secondary: '#fff' },
        },
      }}
    />
  );
}