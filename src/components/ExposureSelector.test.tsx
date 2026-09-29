import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ExposureSelector } from './ExposureSelector.tsx';
import { METHODOLOGY } from '../api/methodology.ts';

afterEach(cleanup);

const presets = METHODOLOGY.exposure_presets;

describe('ExposureSelector', () => {
  it('shows presets as percentages of skin', () => {
    render(<ExposureSelector coverage={0.25} coveragePreset="tshirt_shorts" presets={presets} onChange={() => {}} />);

    expect(screen.getByRole('button', { name: /T-shirt and shorts/ }).textContent).toContain('25%');
    expect(screen.getByRole('button', { name: /Swimsuit/ }).textContent).toContain('85%');
  });

  it('converts a custom percentage to a coverage fraction', () => {
    const onChange = vi.fn();
    render(<ExposureSelector coverage={0.4} coveragePreset={null} presets={presets} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/Custom skin exposure/), { target: { value: '60' } });

    expect(onChange).toHaveBeenCalledWith(0.6, null);
  });

  it('explains an out-of-range value instead of silently ignoring it', () => {
    const onChange = vi.fn();
    render(<ExposureSelector coverage={0.4} coveragePreset={null} presets={presets} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/Custom skin exposure/), { target: { value: '150' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('Enter a percentage from 0 to 100.');
  });
});
