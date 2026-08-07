import { calculateBookingAmounts } from './booking-pricing.util';

describe('calculateBookingAmounts', () => {
  it('Test 1: ₹500/person x 1 person = ₹500 total, ₹250 advance, ₹250 remaining', () => {
    expect(calculateBookingAmounts(500, 1)).toEqual({
      pricePerPerson: 500,
      numberOfPeople: 1,
      totalAmount: 500,
      advanceAmount: 250,
      remainingAmount: 250,
    });
  });

  it('Test 2: ₹500/person x 2 people = ₹1000 total, ₹500 advance, ₹500 remaining', () => {
    expect(calculateBookingAmounts(500, 2)).toEqual({
      pricePerPerson: 500,
      numberOfPeople: 2,
      totalAmount: 1000,
      advanceAmount: 500,
      remainingAmount: 500,
    });
  });

  it('Test 3: ₹500/person x 5 people = ₹2500 total, ₹1250 advance, ₹1250 remaining', () => {
    expect(calculateBookingAmounts(500, 5)).toEqual({
      pricePerPerson: 500,
      numberOfPeople: 5,
      totalAmount: 2500,
      advanceAmount: 1250,
      remainingAmount: 1250,
    });
  });

  it('End-to-end example: Arabic Mehndi Palm Length ₹200/person x 3 people = ₹600 total, ₹300 advance, ₹300 remaining', () => {
    expect(calculateBookingAmounts(200, 3)).toEqual({
      pricePerPerson: 200,
      numberOfPeople: 3,
      totalAmount: 600,
      advanceAmount: 300,
      remainingAmount: 300,
    });
  });

  it('rounds an odd total up for the advance, so advance + remaining always reconstruct the total', () => {
    const result = calculateBookingAmounts(150, 1); // total = 150, 50% = 75 exactly (even case control)
    expect(result.advanceAmount + result.remainingAmount).toBe(result.totalAmount);

    const odd = calculateBookingAmounts(101, 1); // total = 101, 50% = 50.5 -> ceil 51
    expect(odd.advanceAmount).toBe(51);
    expect(odd.remainingAmount).toBe(50);
    expect(odd.advanceAmount + odd.remainingAmount).toBe(odd.totalAmount);
  });
});
