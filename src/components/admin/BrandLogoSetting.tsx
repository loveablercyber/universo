import { useState } from "react";
import { ImagePlus, Save } from "lucide-react";

export function BrandLogoSetting({
  value,
  onSave,
}: {
  value: unknown;
  onSave: (url: string) => Promise<unknown>;
}) {
  const [url, setUrl] = useState(typeof value === "string" ? value : "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const upload = async (file: File) => {
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", "Logo oficial Sól Hair Closet");
      form.append("altText", "Logo oficial Sól Hair Closet");
      const res = await fetch("/api/admin/media", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.publicUrl) throw new Error(data.message || "Falha no upload da logo.");
      setUrl(data.publicUrl);
      setMessage("Logo enviada. Clique em Salvar logo para publicá-la.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no upload da logo.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-2xl border border-copper/10 bg-white p-6">
      <h3 className="font-serif text-xl">Logo oficial da Sól Hair Closet</h3>
      <p className="mt-1 text-xs text-brown/55">
        Envie o arquivo original da marca. A loja usa esta configuração sem recriar ou alterar a
        arte.
      </p>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        {url ? (
          <img
            src={url}
            alt="Prévia da logo oficial"
            className="h-24 w-40 rounded-xl border border-copper/10 bg-white object-contain p-2"
          />
        ) : (
          <div className="grid h-24 w-40 place-items-center rounded-xl border border-dashed border-copper/30">
            <ImagePlus className="text-copper" />
          </div>
        )}
        <div className="flex-1 space-y-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL da logo oficial"
            className="h-10 w-full rounded-xl border border-copper/20 px-3 text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-xl border border-copper px-4 py-2 text-xs font-semibold text-copper">
              {busy ? "Enviando…" : "Enviar logo oficial"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={busy}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            <button
              onClick={async () => {
                setBusy(true);
                await onSave(url);
                setBusy(false);
                setMessage("Logo oficial salva e publicada.");
              }}
              disabled={busy || !url}
              className="flex items-center gap-2 rounded-xl bg-copper px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              <Save size={14} />
              Salvar logo
            </button>
          </div>
        </div>
      </div>
      {message && <p className="mt-3 text-xs text-brown/70">{message}</p>}
    </section>
  );
}
