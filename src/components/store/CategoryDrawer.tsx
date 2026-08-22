import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { X, Sparkles, ArrowRight, Grid } from "lucide-react";
import type { Category } from "@/lib/sol-data";

export function CategoryDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    async function loadCategories() {
      setLoading(true);
      try {
        const res = await fetch("/api/store?action=categories");
        const data = await res.json();
        if (res.ok && data.ok && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      } catch {
        /* fallback */
      } finally {
        setLoading(false);
      }
    }
    void loadCategories();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-ink-deep/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 left-0 flex max-w-full pr-10">
        <aside className="w-screen max-w-md bg-warm-white shadow-2xl flex flex-col border-r border-line">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-cream/40">
            <h2 className="font-serif text-xl tracking-wide uppercase text-ink-deep font-semibold flex items-center gap-2">
              <Grid size={18} className="text-copper" /> Categorias
            </h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-ink-deep/70 hover:bg-blush hover:text-ink-deep transition"
              aria-label="Fechar categorias"
            >
              <X size={20} />
            </button>
          </div>

          {/* Destaque Todos os Produtos */}
          <div className="p-4 border-b border-line bg-blush/40">
            <Link
              to="/sol-hair-closet/produtos"
              onClick={onClose}
              className="flex items-center justify-between p-3.5 rounded-xl bg-warm-white border border-copper/30 text-ink-deep hover:bg-copper hover:text-cream transition group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Sparkles size={18} className="text-copper group-hover:text-cream transition" />
                <span className="text-xs font-semibold tracking-[0.15em] uppercase">
                  Ver Todos os Produtos
                </span>
              </div>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Categorias List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
            {loading && categories.length === 0 ? (
              <div className="py-12 text-center text-text-secondary text-sm">
                Carregando categorias...
              </div>
            ) : (
              categories.map((cat) => (
                <Link
                  key={cat.id}
                  to="/sol-hair-closet/categoria/$slug"
                  params={{ slug: cat.slug || cat.id }}
                  onClick={onClose}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-blush/80 text-ink-deep transition group"
                >
                  <div className="flex items-center gap-3">
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="h-10 w-10 rounded-full object-cover border border-copper/30"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-blush border border-copper/30 grid place-items-center text-copper font-serif font-bold text-xs">
                        ✦
                      </div>
                    )}
                    <div>
                      <p className="text-[13px] font-medium tracking-wide uppercase group-hover:text-copper transition">
                        {cat.name}
                      </p>
                      {cat.productCount !== undefined && (
                        <p className="text-[10px] text-text-secondary">
                          {cat.productCount} {cat.productCount === 1 ? "produto" : "produtos"}
                        </p>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-text-secondary group-hover:text-copper group-hover:translate-x-1 transition" />
                </Link>
              ))
            )}
          </div>

          {/* Links Rápidos */}
          <div className="border-t border-line p-4 bg-cream/30 space-y-2 text-xs">
            <Link
              to="/sol-hair-closet/favoritos"
              onClick={onClose}
              className="block p-2 text-text-secondary hover:text-copper tracking-wider uppercase font-medium"
            >
              ♥ Meus Favoritos
            </Link>
            <Link
              to="/sol-hair-closet/pedidos"
              onClick={onClose}
              className="block p-2 text-text-secondary hover:text-copper tracking-wider uppercase font-medium"
            >
              📦 Meus Pedidos
            </Link>
            <Link
              to="/sol-hair-closet/conta"
              onClick={onClose}
              className="block p-2 text-text-secondary hover:text-copper tracking-wider uppercase font-medium"
            >
              👤 Minha Conta / Entrar
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
