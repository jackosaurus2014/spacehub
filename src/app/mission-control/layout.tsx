// Metadata moved to page.tsx when Mission Control became a server component
// (SYNTHESIS.md item 14). This layout stays as the segment's boundary host for
// error.tsx and loading.tsx.
export default function MissionControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
