import { describe, expect, test } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { fill, renderInline } from './inline';

const show = (text) => render(<MemoryRouter><p>{renderInline(text)}</p></MemoryRouter>);

describe('fill', () => {
  test('replaces placeholders, including repeats and extra spaces', () => {
    expect(fill('Hi {{name}}, {{ name }}!', { name: 'Nimal' })).toBe('Hi Nimal, Nimal!');
  });
  test('leaves unknown placeholders untouched', () => {
    expect(fill('Hello {{missing}}', { name: 'x' })).toBe('Hello {{missing}}');
  });
  test('is not fooled by inherited object keys', () => {
    expect(fill('{{constructor}} {{toString}}', {})).toBe('{{constructor}} {{toString}}');
  });
  test('handles empty input', () => {
    expect(fill(undefined, {})).toBe('');
  });
});

describe('renderInline', () => {
  test('renders links and unsafe text safely', () => {
    show('See [FAQ](/faq), [Docs](https://example.com/docs), [Mail](mailto:a@b.lk) and [bad](javascript:alert(1)');
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/faq');
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'Mail' })).not.toHaveAttribute('target');
    expect(screen.queryByRole('link', { name: 'bad' })).not.toBeInTheDocument();
  });
  test('renders bold and raw HTML as text', () => {
    const { container } = show('This is **important** <b>text</b>');
    expect(container.querySelector('strong')).toHaveTextContent('important');
    expect(container.querySelector('b')).toBeNull();
  });
});
