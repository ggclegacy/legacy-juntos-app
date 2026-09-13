import Link from "next/link";
export default function NotFound() {
  return (
    <main className="fatal">
      <h1>Let’s find your way home.</h1>
      <Link href="/">Return to Juntos</Link>
    </main>
  );
}
