// /** @type {import('next').NextConfig} */
// const nextConfig = {};

// export default nextConfig;

// import dotenv from "dotenv";

// // Load environment variables from .env.local
// dotenv.config({ path: ".env.local" });

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
  },
};

export default nextConfig;
