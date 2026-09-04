"use client";

// Small client island for the one interactive bit of the print page — the
// button itself is hidden by @media print (see page.tsx) so it never shows
// up in the printed output or the PDF a browser's "Save as PDF" produces.
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white"
    >
      Печать
    </button>
  );
}
