// @ts-check

export const PLATFORM_COMMISSION_RATE = 0.15;

/**
 * @param {number | string} price
 * @param {number | string} [commissionRate]
 * @returns {{ price: number, platformFee: number, studentAmount: number }}
 */
export function calculatePayout(price, commissionRate = PLATFORM_COMMISSION_RATE) {
  const safePrice = Number(price) || 0;
  const safeRate = Number(commissionRate) || 0;
  const platformFee = Number((safePrice * safeRate).toFixed(2));
  const studentAmount = Number((safePrice - platformFee).toFixed(2));

  return {
    price: safePrice,
    platformFee,
    studentAmount,
  };
}

/**
 * @param {number | string} value
 * @returns {string}
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}
