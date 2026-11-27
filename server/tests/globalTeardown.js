export default async function globalTeardown() {
  await globalThis.__REPLSET__?.stop();
}
