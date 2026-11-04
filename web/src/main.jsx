import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProviders } from './app/providers.jsx';
import { AppRouter } from './app/router/AppRouter.jsx';
import './assets/assets-comercia/fonts/fonts.css';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 20_000, refetchOnWindowFocus: true, retry: 1 } },
});

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppProviders queryClient={queryClient}>
          <AppRouter />
        </AppProviders>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
