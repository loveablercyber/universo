import React, { useEffect, useState } from "react";
import { Upload, Trash2, Image as ImageIcon, Search } from "lucide-react";

interface MediaItem {
  id: string;
  fileName: string;
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  title?: string;
  altText?: string;
  createdAt: string;
}

export function MediaLibrary({ onSelect }: { onSelect?: (url: string) => void }) {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const fetchMedia = async () => {
    try {
      const res = await fetch("/api/admin/media");
      const data = await res.json();
      if (data.ok) setMediaList(data.media);
    } catch {
      setError("Falha ao carregar biblioteca de mídias.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMedia();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Erro no upload.");
      await fetchMedia();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente remover esta mídia?")) return;
    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-media", id }),
      });
      if (res.ok) await fetchMedia();
    } catch {
      setError("Não foi possível excluir a mídia.");
    }
  };

  const filteredMedia = mediaList.filter((m) =>
    m.fileName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 rounded-2xl border border-copper/15 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-copper/10 pb-4">
        <div>
          <h3 className="font-serif text-2xl text-brown">Biblioteca de Mídias</h3>
          <p className="text-xs text-brown/60">
            Upload seguro e gerenciamento de arquivos visuais (S3 Ready).
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-copper px-4 py-2 text-xs font-semibold text-white hover:bg-copper/90">
          <Upload size={14} /> {uploading ? "Enviando..." : "Fazer Upload"}
          <input
            type="file"
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {error && <p className="text-xs text-red-700 bg-red-50 p-3 rounded-xl">{error}</p>}

      <div className="relative">
        <Search size={14} className="absolute left-3 top-3 text-brown/40" />
        <input
          type="text"
          placeholder="Buscar imagens por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-xl border border-copper/20 bg-cream/20 pl-9 pr-3 text-xs outline-none focus:border-copper"
        />
      </div>

      {loading ? (
        <p className="text-xs text-brown/60 text-center py-8">Carregando mídias...</p>
      ) : filteredMedia.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-copper/20 rounded-2xl">
          <ImageIcon size={32} className="mx-auto text-copper/40 mb-2" />
          <p className="text-xs text-brown/60">Nenhuma imagem encontrada.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-xl border border-copper/15 bg-cream/10 p-2 overflow-hidden"
            >
              <img
                src={item.publicUrl}
                alt={item.altText || item.fileName}
                className="h-28 w-full object-cover rounded-lg"
              />
              <div className="mt-2 flex items-center justify-between text-[11px] text-brown/70">
                <span className="truncate max-w-[100px]" title={item.fileName}>
                  {item.fileName}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {onSelect && (
                <button
                  onClick={() => onSelect(item.publicUrl)}
                  className="mt-2 w-full rounded-lg bg-copper/10 py-1 text-[10px] font-bold text-copper hover:bg-copper hover:text-white"
                >
                  SELECIONAR
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
