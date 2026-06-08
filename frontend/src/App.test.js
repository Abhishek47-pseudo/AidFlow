import { render, screen } from '@testing-library/react';
import App from './App';

test('renders AidFlow AI logo text', () => {
  render(<App />);
  const linkElement = screen.getByText(/AidFlow AI/i);
  expect(linkElement).toBeInTheDocument();
});
