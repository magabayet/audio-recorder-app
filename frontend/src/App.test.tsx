import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Audio Recorder con Transcripción/i);
  expect(titleElement).toBeInTheDocument();
});
