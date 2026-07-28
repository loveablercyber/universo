import React, { useEffect, useState } from "react";
import { History, RotateCcw, User, Calendar } from "lucide-react";

interface CmsVersion {
  id: number;
  version: number;
  title: string;
  status: string;
  createdAt: string;
  authorName?: string;
}

export function CmsVersionHistory({
  pageId,
  onRestore,
  onClose,
}: {
  pageId: string;
  onRestore: (versionNumber: number) => Promise<void>;
  onClose: () => void;
}) {
  const [versions, setVersions] = useState<CmsVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => {
    async function loadVersions() {
      try {
        const res = await fetch(`/api/admin/cms?action=versions&pageId=${pageId}`);
        const data = await res.json();
        if (data.ok) setVersions(data.versions);
      } finally {
        setLoading(false);
      }
    }
    void loadVersions();
  }, [pageId]);

  const handleRestore = async (versionNumber: number) => {
    if (!window.confirm(`Tem certeza que deseja restaurar a versão ${versionNumber}?`)) return;
    setRestoring(versionNumber);
    try {
      await onRestore(versionNumber);
      onClose();
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-copper/10 pb-3">
          <div className="flex items-center gap-2">
            <History size={18} className="text-copper" />
            <h3 className="font-serif text-xl text-brown">Histórico de Versões</h3>
          </div>
          <button onClick={onClose} className="text-xs text-brown/60 hover:text-brown">
            Fechar
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-brown/60 py-8 text-center">Carregando versões...</p>
        ) : versions.length === 0 ? (
          <p className="text-xs text-brown/60 py-8 text-center">
            Nenhuma versão anterior registrada.
          </p>
        ) : (
          <div className="overflow-y-auto space-y-3 flex-1 pr-1">
            {versions.map((ver) => (
              <div
                key={ver.id}
                className="flex items-center justify-between rounded-xl border border-copper/15 bg-cream/20 p-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 font-medium text-brown">
                    <span>Versão #{ver.version}</span>
                    <span className="text-[10px] uppercase tracking-wider text-copper bg-copper/10 px-2 py-0.5 rounded-md">
                      {ver.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-[11px] text-brown/60">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {new Date(ver.createdAt).toLocaleString("pt-BR")}
                    </span>
                    <span className="flex items-center gap-1">
                      <User size={12} /> {ver.authorName || "Sistema"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(ver.version)}
                  disabled={restoring === ver.version}
                  className="inline-flex items-center gap-1 rounded-lg bg-copper px-3 py-1.5 text-xs text-white hover:bg-copper/90 disabled:opacity-50"
                >
                  <RotateCcw size={12} />{" "}
                  {restoring === ver.version ? "Restaurando..." : "Restaurar"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
