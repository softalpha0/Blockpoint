export const USDC_ADDRESS =
  process.env.NEXT_PUBLIC_TEST_USDC_ADDRESS ||
  process.env.NEXT_PUBLIC_USDC ||
  null;

if (!USDC_ADDRESS && process.env.NODE_ENV === "production") {
  console.warn("USDC address missing");
}
