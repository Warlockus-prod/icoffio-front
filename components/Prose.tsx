export function Prose({ html }: { html: string }) {
  return (
    <div
      className="prose prose-neutral max-w-none prose-img:rounded-xl prose-a:text-neutral-900 hover:prose-a:underline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
