import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmailDraftEngine from '../EmailDraftEngine';
import '@testing-library/jest-dom';

// Mock the fetch API
global.fetch = jest.fn();

describe('EmailDraftEngine', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('renders initial state correctly', () => {
    render(<EmailDraftEngine />);
    expect(screen.getByText(/AI Email Drafting Engine/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste meeting transcript/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Draft/i })).toBeDisabled();
  });

  it('enables generate button when input is provided', () => {
    render(<EmailDraftEngine />);
    const notes = screen.getByPlaceholderText(/Paste meeting transcript/i);
    const intent = screen.getByPlaceholderText(/e.g. Follow up/i);
    
    fireEvent.change(notes, { target: { value: 'Test meeting notes' } });
    fireEvent.change(intent, { target: { value: 'Draft a thank you' } });
    
    expect(screen.getByRole('button', { name: /Generate Draft/i })).toBeEnabled();
  });

  it('displays the AI draft after successful generation', async () => {
    const mockDraft = {
      subject: 'Test Subject',
      body: 'Test Body',
      action_items: ['Item 1'],
      suggested_recipients: ['Alex'],
      summary: 'Short summary',
      task_id: '123'
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockDraft,
    });

    render(<EmailDraftEngine />);
    
    // Fill inputs
    fireEvent.change(screen.getByPlaceholderText(/Paste meeting transcript/i), { target: { value: '...' } });
    fireEvent.change(screen.getByPlaceholderText(/e.g. Follow up/i), { target: { value: '...' } });
    
    // Click generate
    fireEvent.click(screen.getByRole('button', { name: /Generate Draft/i }));

    // Wait for display
    await waitFor(() => {
      expect(screen.getByText('Test Subject')).toBeInTheDocument();
      expect(screen.getByText('Test Body')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  it('handles API failure gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('API Error'));
    console.error = jest.fn(); // Suppress log for test

    render(<EmailDraftEngine />);
    fireEvent.change(screen.getByPlaceholderText(/Paste meeting transcript/i), { target: { value: '...' } });
    fireEvent.change(screen.getByPlaceholderText(/e.g. Follow up/i), { target: { value: '...' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Generate Draft/i }));

    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
    });
  });
});
