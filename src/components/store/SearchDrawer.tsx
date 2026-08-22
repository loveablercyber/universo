import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Search, X, ArrowRight, Loader2 } from "lucide-react";
import type { Product } from "@/lib/sol-data";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function SearchDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/store?action=search_suggestions&q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (res.ok && data.ok && Array.isArray(data.suggestions)) {
          setResults(data.suggestions);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-ink-deep/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <aside className="w-screen max-w-md bg-warm-white shadow-2xl flex flex-col border-l border-line">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-cream/40">
            <h2 className="font-serif text-xl tracking-wide uppercase text-ink-deep font-semibold flex items-center gap-2">
              <Search size={18} className="text-copper" /> Buscar Produtos
            </h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-ink-deep/70 hover:bg-blush hover:text-ink-deep transition"
              aria-label="Fechar busca"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-6 border-b border-line">
            <div className="relative flex items-center rounded-full border border-copper/30 bg-warm-white px-4 py-3 shadow-inner focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/20">
              <Search size={18} className="text-copper shrink-0 mr-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                placeholder="Ex: Fibra russa, peruca, lace, aplique..."
                className="w-full bg-transparent outline-none text-sm text-ink-deep placeholder:text-text-secondary"
              />
              {loading && <Loader2 size={16} className="animate-spin text-copper shrink-0 ml-2" />}
              {query && !loading && (
                <button
                  onClick={() => setQuery("")}
                  className="text-text-secondary hover:text-ink-deep ml-2"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading && results.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-text-secondary text-sm">
                <Loader2 size={20} className="animate-spin mr-2 text-copper" /> Buscando produtos...
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-text-secondary tracking-wider uppercase font-semibold">
                  Sugestões ({results.length})
                </p>
                <div className="divide-y divide-line">
                  {results.map((p) => {
                    const price = Number(p.promotionalPrice ?? p.price);
                    return (
                      <Link
                        key={p.id}
                        to="/sol-hair-closet/produto/$slug"
                        params={{ slug: p.slug || p.id }}
                        onClick={onClose}
                        className="flex items-center gap-4 py-3 group hover:bg-blush/60 -mx-3 px-3 rounded-xl transition"
                      >
                        <img
                          src={p.image || "/images/produto-fibra-russa.jpg"}
                          alt={p.name}
                          className="h-14 w-14 rounded-lg object-cover border border-line bg-blush shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] font-medium text-ink-deep leading-snug group-hover:text-copper transition truncate">
                            {p.name}
                          </h4>
                          {p.info && (
                            <p className="text-[11px] text-text-secondary truncate mt-0.5">
                              {p.info}
                            </p>
                          )}
                          <p className="text-xs font-semibold text-ink-deep mt-1 font-serif">
                            {fmt(price)}
                          </p>
                        </div>
                        <ArrowRight size={14} className="text-text-secondary group-hover:text-copper group-hover:translate-x-1 transition" />
                      </Link>
                    );
                  })}
                </div>

                <div className="pt-4">
                  <Link
                    to="/sol-hair-closet/busca"
                    search={{ q: query.trim() }}
                    onClick={onClose}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-copper/40 bg-blush px-4 py-2.5 text-xs font-semibold tracking-wider text-ink-deep hover:bg-copper hover:text-warm-white transition"
                  >
                    VER TODOS OS RESULTADOS ({results.length}) <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ) : query ? (
              <div className="text-center py-16 text-text-secondary">
                <p className="text-sm font-medium text-ink-deep">Nenhum produto encontrado para "{query}"</p>
                <p className="text-xs mt-1">Tente pesquisar com termos mais genéricos.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-text-secondary tracking-wider uppercase font-semibold">
                  Buscas populares
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Fibra Russa", "Lace Front", "Rabo de Cavalo", "Crochet Cacheado", "Perucas", "Apliques"].map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="rounded-full border border-line bg-blush/40 px-3.5 py-1.5 text-xs text-ink-deep hover:border-copper hover:bg-blush transition"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
