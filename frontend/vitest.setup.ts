import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));
