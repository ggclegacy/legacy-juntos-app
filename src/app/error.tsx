"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="fatal">
      <h1>A moment to reconnect.</h1>
      <p>This page could not load. Please try again.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
