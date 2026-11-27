export default function CheckoutSkeleton() {
  return (
    <main className="mx-auto max-w-6xl animate-pulse px-4 py-10">
      <div className="mb-6 h-8 w-40 rounded bg-gray-200" />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="h-96 rounded-xl bg-gray-200 lg:col-span-2" />
        <div className="h-72 rounded-xl bg-gray-200" />
      </div>
    </main>
  );
}
