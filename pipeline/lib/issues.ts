/** A problem found while building. Errors fail the build; warnings go in the report. */
export interface Issue {
  level: 'error' | 'warning';
  /** Short machine-friendly name of the check, e.g. "area-jump" */
  check: string;
  message: string;
  /** Size of the problem, used to sort warnings so the largest come first */
  weight?: number;
}

export const error = (check: string, message: string): Issue => ({ level: 'error', check, message });
export const warning = (check: string, message: string, weight?: number): Issue => ({ level: 'warning', check, message, weight });
