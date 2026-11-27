import ShippingMethod from "../src/models/ShippingMethod.js";

export async function seedShippingMethods() {
  await Promise.all([
    ShippingMethod.findOneAndUpdate(
      { code: "standard" },
      {
        $set: {
          name: "Standard",
          description: "Reliable standard delivery",
          minDeliveryDays: 3,
          maxDeliveryDays: 5,
          flatPrice: 50000,
          provinceRates: [{ province: "Western Province", price: 40000 }],
          freeShippingThreshold: 5000000,
          isActive: true,
          sortOrder: 1,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ),
    ShippingMethod.findOneAndUpdate(
      { code: "express" },
      {
        $set: {
          name: "Express",
          description: "Faster priority delivery",
          minDeliveryDays: 1,
          maxDeliveryDays: 2,
          flatPrice: 100000,
          provinceRates: [],
          freeShippingThreshold: null,
          isActive: true,
          sortOrder: 2,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ),
  ]);
}
