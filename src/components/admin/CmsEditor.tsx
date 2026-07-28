import React, { useState } from "react";
import {
  CmsPageContent,
  CmsSection,
  CmsHeroSection,
  CmsTextSection,
  CmsCardsSection,
} from "@/lib/cms.types";
import { Plus, Trash2, Save, Eye, History, Layers } from "lucide-react";

interface CmsEditorProps {
  pageId: string;
  initialTitle: string;
  initialStatus: "draft" | "published" | "archived";
  initialContent: CmsPageContent;
  initialSeo: Record<string, unknown>;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  onViewHistory: () => void;
}

export function CmsEditor({
  pageId,
  initialTitle,
  initialStatus,
  initialContent,
  initialSeo,
  onSave,
  onViewHistory,
}: CmsEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState(initialStatus);
  const [sections, setSections] = useState<CmsSection[]>(initialContent?.sections || []);
  const [seo, setSeo] = useState(initialSeo || {});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "seo" | "preview">("content");

  const addSection = (type: CmsSection["type"]) => {
    let newSec: CmsSection;
    if (type === "hero") {
      newSec = { type: "hero", title: "Novo Título Principal", subtitle: "Subtítulo da seção" };
    } else if (type === "text") {
      newSec = { type: "text", title: "Título do Bloco", content: "Escreva o texto aqui..." };
    } else {
      newSec = {
        type: "cards",
        title: "Nossos Destaques",
        items: [{ title: "Item 1", description: "Descrição do item" }],
      };
    }
    setSections([...sections, newSec]);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const updateSection = (index: number, updated: CmsSection) => {
    const next = [...sections];
    next[index] = updated;
    setSections(next);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        action: "save-page",
        id: pageId,
        title,
        status,
        content: { sections },
        seo,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-copper/15 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-copper/10 pb-4">
        <div>
          <h3 className="font-serif text-2xl text-brown">Editor de Página</h3>
          <p className="text-xs text-brown/60">Altere blocos visuais e SEO sem mexer em JSON.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onViewHistory}
            className="inline-flex items-center gap-1.5 rounded-xl border border-copper/20 px-3 py-2 text-xs font-medium text-brown hover:bg-cream/40"
          >
            <History size={14} /> Histórico de Versões
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-copper px-4 py-2 text-xs font-semibold text-white transition hover:bg-copper/90 disabled:opacity-50"
          >
            <Save size={14} /> {saving ? "Salvando..." : "Salvar Página"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-medium text-brown">
          Título da Página
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-copper/20 bg-cream/20 px-3 text-sm outline-none focus:border-copper"
          />
        </label>
        <label className="block text-xs font-medium text-brown">
          Status de Publicação
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "published" | "archived")}
            className="mt-1 h-10 w-full rounded-xl border border-copper/20 bg-white px-3 text-sm outline-none focus:border-copper"
          >
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
            <option value="archived">Arquivado</option>
          </select>
        </label>
      </div>

      <div className="flex border-b border-copper/10 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab("content")}
          className={`pb-2 text-xs font-semibold ${activeTab === "content" ? "border-b-2 border-copper text-copper" : "text-brown/60"}`}
        >
          <Layers size={14} className="inline mr-1" /> Seções da Página ({sections.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("seo")}
          className={`pb-2 text-xs font-semibold ${activeTab === "seo" ? "border-b-2 border-copper text-copper" : "text-brown/60"}`}
        >
          <Eye size={14} className="inline mr-1" /> SEO & Metadados
        </button>
      </div>

      {activeTab === "content" && (
        <div className="space-y-6">
          {sections.map((sec, idx) => (
            <div
              key={idx}
              className="relative rounded-xl border border-copper/20 bg-cream/10 p-4 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-copper/10 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-copper">
                  Seção {idx + 1}: {sec.type}
                </span>
                <button
                  type="button"
                  onClick={() => removeSection(idx)}
                  className="text-red-600 hover:text-red-800 text-xs inline-flex items-center gap-1"
                >
                  <Trash2 size={13} /> Remover
                </button>
              </div>

              {sec.type === "hero" && (
                <div className="space-y-2">
                  <input
                    placeholder="Título Principal"
                    value={(sec as CmsHeroSection).title}
                    onChange={(e) => updateSection(idx, { ...sec, title: e.target.value })}
                    className="w-full h-9 rounded-lg border border-copper/20 px-3 text-xs"
                  />
                  <textarea
                    placeholder="Subtítulo / Descrição"
                    value={(sec as CmsHeroSection).subtitle || ""}
                    onChange={(e) => updateSection(idx, { ...sec, subtitle: e.target.value })}
                    className="w-full rounded-lg border border-copper/20 p-2 text-xs"
                  />
                </div>
              )}

              {sec.type === "text" && (
                <div className="space-y-2">
                  <input
                    placeholder="Título (opcional)"
                    value={(sec as CmsTextSection).title || ""}
                    onChange={(e) => updateSection(idx, { ...sec, title: e.target.value })}
                    className="w-full h-9 rounded-lg border border-copper/20 px-3 text-xs"
                  />
                  <textarea
                    placeholder="Conteúdo completo"
                    rows={4}
                    value={(sec as CmsTextSection).content}
                    onChange={(e) => updateSection(idx, { ...sec, content: e.target.value })}
                    className="w-full rounded-lg border border-copper/20 p-2 text-xs"
                  />
                </div>
              )}

              {sec.type === "cards" && (
                <div className="space-y-2">
                  <input
                    placeholder="Título da Seção de Cards"
                    value={(sec as CmsCardsSection).title || ""}
                    onChange={(e) => updateSection(idx, { ...sec, title: e.target.value })}
                    className="w-full h-9 rounded-lg border border-copper/20 px-3 text-xs"
                  />
                  <p className="text-[11px] text-brown/60">
                    Itens configurados: {(sec as CmsCardsSection).items?.length || 0}
                  </p>
                </div>
              )}
            </div>
          ))}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => addSection("hero")}
              className="inline-flex items-center gap-1 rounded-lg border border-copper/30 bg-cream/40 px-3 py-1.5 text-xs text-brown hover:bg-copper hover:text-white"
            >
              <Plus size={13} /> Add Hero
            </button>
            <button
              type="button"
              onClick={() => addSection("text")}
              className="inline-flex items-center gap-1 rounded-lg border border-copper/30 bg-cream/40 px-3 py-1.5 text-xs text-brown hover:bg-copper hover:text-white"
            >
              <Plus size={13} /> Add Texto
            </button>
            <button
              type="button"
              onClick={() => addSection("cards")}
              className="inline-flex items-center gap-1 rounded-lg border border-copper/30 bg-cream/40 px-3 py-1.5 text-xs text-brown hover:bg-copper hover:text-white"
            >
              <Plus size={13} /> Add Cards
            </button>
          </div>
        </div>
      )}

      {activeTab === "seo" && (
        <div className="space-y-4">
          <label className="block text-xs font-medium text-brown">
            Título SEO (Meta Title)
            <input
              type="text"
              value={String(seo.title || "")}
              onChange={(e) => setSeo({ ...seo, title: e.target.value })}
              className="mt-1 h-9 w-full rounded-xl border border-copper/20 px-3 text-xs"
            />
          </label>
          <label className="block text-xs font-medium text-brown">
            Descrição SEO (Meta Description)
            <textarea
              rows={3}
              value={String(seo.description || "")}
              onChange={(e) => setSeo({ ...seo, description: e.target.value })}
              className="mt-1 w-full rounded-xl border border-copper/20 p-2 text-xs"
            />
          </label>
        </div>
      )}
    </div>
  );
}
