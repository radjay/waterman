import { redirect } from "next/navigation";

export const metadata = {
  title: 'The Waterman Report',
};

export default function Home() {
  // Redirect to dashboard as the default landing page
  redirect('/dashboard');
}
