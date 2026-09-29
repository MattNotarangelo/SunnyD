import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SkinTypeSelector } from './SkinTypeSelector.tsx';
import { METHODOLOGY } from '../api/methodology.ts';

afterEach(cleanup);

describe('SkinTypeSelector', () => {
  it('offers six labelled types with the current one checked', () => {
    render(<SkinTypeSelector skinType={3} fitzpatrick={METHODOLOGY.fitzpatrick_table} onChange={() => {}} />);

    expect(screen.getAllByRole('radio')).toHaveLength(6);
    expect((screen.getByLabelText(/Type III:/) as HTMLInputElement).checked).toBe(true);
  });

  it('describes the selected type in plain language', () => {
    render(<SkinTypeSelector skinType={5} fitzpatrick={METHODOLOGY.fitzpatrick_table} onChange={() => {}} />);

    expect(screen.getByText('Very rarely burns, tans very easily')).toBeTruthy();
    expect(screen.getByText('Needs about 2.8× as much sun as type I.')).toBeTruthy();
  });

  it('reports the picked type', () => {
    const onChange = vi.fn();
    render(<SkinTypeSelector skinType={2} fitzpatrick={METHODOLOGY.fitzpatrick_table} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText(/Type VI:/));

    expect(onChange).toHaveBeenCalledWith(6);
  });
});
