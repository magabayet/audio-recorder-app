import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

test('renders login screen when not authenticated', async () => {
  render(<App />);
  // Esperar a que el auth listener resuelva y muestre el login
  await waitFor(() => {
    expect(screen.getByText(/Inicia sesión para continuar/i)).toBeInTheDocument();
  }, { timeout: 3000 });
});
