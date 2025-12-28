using System;

namespace Backend.Helpers
{
    public static class PricingHelper
    {
        public static decimal CalculateDiscountedPrice(decimal price, decimal discountPercent)
        {
            var clampedDiscount = Math.Clamp(discountPercent, 0m, 100m);
            var discountedAmount = price - (price * clampedDiscount / 100m);

            return discountedAmount < 0 ? 0 : discountedAmount;
        }
    }
}