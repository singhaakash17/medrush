export const formatPaise = (paise: number): string => {
  return `₹${(paise / 100).toFixed(2)}`;
};

export const discountPercent = (bps: number): string => {
  return `${(bps / 100).toFixed(0)}% off`;
};
