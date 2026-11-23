import type { ReactNode } from "react";

export const metadata = {
  title: "Flowboard",
  description: "A shared Kanban board that keeps everyone’s changes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, height: "100vh", overflow: "hidden" }}>{children}</body>
    </html>
  );
}
