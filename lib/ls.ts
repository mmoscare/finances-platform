import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";
require("dotenv").config({ path: ".env.local" });

export const setupLemon = () => {
  return lemonSqueezySetup({
    apiKey: process.env.LEMONSQUEEZY_API_KEY!,
  });
};
