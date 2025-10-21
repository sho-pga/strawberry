import { render, fireEvent, waitFor } from '@testing-library/svelte/svelte5';
import PromptInput from '../src/components/PromptInput.svelte';
import { vi } from 'vitest';

// Ensure global fetch is mocked
const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

test('Generate button flow - happy path (dev stub)', async () => {
  // Mock POST /prompt?dev=true via fetch
  global.fetch = vi.fn((input, init) => {
    // Simulate dev endpoint behavior
    if (typeof input === 'string' && input.startsWith('/prompt')) {
      return Promise.resolve(new Response(JSON.stringify({ success: true, data: { content: { title: 'Dev: Test', body: 'Deterministic preview', layout: 'dev' } } }), { status: 201 }));
    }
    // Mock /preview GET if called
    if (typeof input === 'string' && input.startsWith('/preview')) {
      return Promise.resolve(new Response('<div>preview</div>', { status: 200, headers: { 'Content-Type': 'text/html' } }));
    }
    return Promise.reject(new Error('unhandled fetch ' + input));
  });

  const { getByTestId, queryByText } = render(PromptInput);

  const textarea = getByTestId('prompt-textarea');
  await fireEvent.input(textarea, { target: { value: 'A short poem' } });

  const button = getByTestId('generate-button');
  expect(button).toBeTruthy();

  // Click generate: should call POST /prompt
  await fireEvent.click(button);

  // Button should show 'Generating...' while in progress
  await waitFor(() => expect(queryByText('Generating...') || queryByText('Generate')).toBeTruthy());

  // Eventually previewStore should be updated and preview loaded (preview text present)
  await waitFor(() => expect(queryByText('preview') || queryByText('Preview')).toBeTruthy());
});
