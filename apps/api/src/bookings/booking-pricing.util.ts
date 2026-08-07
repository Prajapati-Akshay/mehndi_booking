export interface BookingAmounts {
  pricePerPerson: number;
  numberOfPeople: number;
  totalAmount: number;
  advanceAmount: number;
  remainingAmount: number;
}

/** Pure calculation, kept separate from BookingsService so it can be unit tested directly. */
export function calculateBookingAmounts(pricePerPerson: number, numberOfPeople: number): BookingAmounts {
  const totalAmount = pricePerPerson * numberOfPeople;
  const advanceAmount = Math.ceil(totalAmount * 0.5);
  const remainingAmount = totalAmount - advanceAmount;
  return { pricePerPerson, numberOfPeople, totalAmount, advanceAmount, remainingAmount };
}
