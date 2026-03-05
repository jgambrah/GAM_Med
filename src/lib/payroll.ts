/**
 * Helper to calculate PAYE based on GRA graduated brackets.
 * Assumes brackets are provided as bands, not cumulative values.
 * e.g., [{ upTo: 402, rate: 0}, { upTo: 110, rate: 5}, ...]
 *
 * @param taxableIncome The amount of income subject to PAYE.
 * @param brackets The array of tax brackets from payroll configuration.
 * @returns The calculated PAYE tax amount.
 */
export const calculatePAYE = (taxableIncome: number, brackets: { upTo: number; rate: number }[]): number => {
  let tax = 0;
  let incomeRemaining = taxableIncome;

  // Sort brackets by `upTo` just in case they are not ordered, though they should be.
  const sortedBrackets = [...brackets].sort((a, b) => a.upTo - b.upTo);

  for (const bracket of sortedBrackets) {
    if (incomeRemaining <= 0) {
      break;
    }
    const taxableInBracket = Math.min(incomeRemaining, bracket.upTo);
    tax += taxableInBracket * (bracket.rate / 100);
    incomeRemaining -= taxableInBracket;
  }
  
  // If income remains after iterating through all defined bracket widths,
  // it's taxed at the highest rate. This handles the "Exceeding" final tier.
  if (incomeRemaining > 0 && sortedBrackets.length > 0) {
    tax += incomeRemaining * (sortedBrackets[sortedBrackets.length - 1].rate / 100);
  }

  return tax;
};

/**
 * Helper for Pro-rata calculation based on join date.
 * @param joinDate The employee's joining date (can be a Firestore Timestamp or Date object).
 * @param month The payroll month (0-indexed, e.g., 0 for January).
 * @param year The payroll year.
 * @returns A multiplier (0 to 1) for pro-rata calculation.
 */
export const getProRataMultiplier = (joinDate: any, month: number, year: number): number => {
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = endOfMonth.getDate();
  
  // Handle different possible date formats from Firestore
  const jDate = joinDate?.toDate ? joinDate.toDate() : new Date(joinDate);
  
  // If they joined before this month, they get 100%
  if (jDate < startOfMonth) return 1;
  // If they joined after this month, they get 0%
  if (jDate > endOfMonth) return 0;
  
  // Calculate active days
  const activeDays = daysInMonth - jDate.getDate() + 1;
  return activeDays / daysInMonth;
};
