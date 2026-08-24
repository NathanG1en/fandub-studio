import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FanDub Studio - Collaborative AI-Powered Voiceover Dubbing',
  description: 'Create hilarious fan dubs from YouTube videos with automatic speaker diarization, browser voice recording, and real-time collaboration.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-gray-100 min-h-screen selection:bg-primary selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
