import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Save, X } from "lucide-react";
import { resolveStoreHomeConfig, type StoreHomeConfig } from "@/lib/store-home";

type CatalogItem = { id: string; name: string; parentId?: string | null };

function OrderedSelection({
  label,
  items,
  selectedIds,
  max,
  onChange,
}: {
  label: string;
  items: CatalogItem[];
  selectedIds: string[];
  max: number;
  onChange: (ids: string[]) => void;
}) {
  const selected = selectedIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is CatalogItem => Boolean(item));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <fieldset className="rounded-xl border border-copper/15 p-4">
      <legend className="px-2 text-xs font-semibold text-brown">
        {label} ({selectedIds.length}/{max})
      </legend>
      {selected.length ? (
        <ol className="mb-4 space-y-2">
          {selected.map((item, index) => (
            <li key={item.id} className="flex items-center gap-2 rounded-lg bg-cream/60 px-3 py-2">
              <span className="w-5 text-[10px] font-bold text-copper">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-brown">{item.name}</span>
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Mover ${item.name} para cima`}
                className="p-1 text-copper disabled:opacity-25"
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === selected.length - 1}
                aria-label={`Mover ${item.name} para baixo`}
                className="p-1 text-copper disabled:opacity-25"
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                onClick={() => onChange(selectedIds.filter((id) => id !== item.id))}
                aria-label={`Remover ${item.name} da Home`}
                className="p-1 text-red-500"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mb-3 text-[11px] text-brown/55">Seleção automática pelos mais vendidos.</p>
      )}
      <select
        value=""
        onChange={(event) => {
          const id = event.target.value;
          if (id && !selectedIds.includes(id) && selectedIds.length < max) {
            onChange([...selectedIds, id]);
          }
        }}
        disabled={selectedIds.length >= max}
        className="h-10 w-full rounded-xl border border-copper/20 bg-white px-3 text-xs disabled:opacity-50"
      >
        <option value="">Adicionar item…</option>
        {items
          .filter((item) => !selectedIds.includes(item.id))
          .map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
      </select>
    </fieldset>
  );
}

export function StoreHomeSetting({
  value,
  onSave,
}: {
  value: unknown;
  onSave: (config: StoreHomeConfig) => Promise<unknown>;
}) {
  const [config, setConfig] = useState(() => resolveStoreHomeConfig(value));
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/store?action=categories").then((response) => response.json()),
      fetch("/api/admin/store?action=products").then((response) => response.json()),
    ])
      .then(([categoryPayload, productPayload]) => {
        setCategories(
          ((categoryPayload.categories || []) as CatalogItem[]).filter((item) => !item.parentId),
        );
        setProducts((productPayload.products || []) as CatalogItem[]);
      })
      .catch(() => setMessage("Não foi possível carregar o catálogo para seleção."));
  }, []);

  const update = <K extends keyof StoreHomeConfig>(key: K, nextValue: StoreHomeConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: nextValue }));
  };

  const uploadHero = async (file: File) => {
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", "Banner principal da Sol Hair Closet");
      form.append("altText", "Banner da coleção Sol Hair Closet");
      const response = await fetch("/api/admin/media", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok || !payload.publicUrl) {
        throw new Error(payload.message || "Falha ao enviar o banner.");
      }
      update("heroImageUrl", payload.publicUrl);
      setMessage("Banner enviado. Salve a configuração para publicá-lo.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Falha ao enviar o banner.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-copper/10 bg-white p-6">
      <h3 className="font-serif text-xl">Página inicial da Sol Hair Closet</h3>
      <p className="mt-1 text-xs text-brown/55">
        Gerencie o banner, o CTA, as categorias e os produtos exibidos na Home.
      </p>

      <div className="mt-5 grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-brown">
            Chamada superior
            <input
              value={config.heroEyebrow}
              onChange={(event) => update("heroEyebrow", event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-copper/20 px-3 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-brown">
            Título principal
            <input
              value={config.heroTitle}
              onChange={(event) => update("heroTitle", event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-copper/20 px-3 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-brown sm:col-span-2">
            Subtítulo
            <textarea
              value={config.heroSubtitle}
              onChange={(event) => update("heroSubtitle", event.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-copper/20 p-3 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-brown">
            Texto do botão
            <input
              value={config.heroCtaLabel}
              onChange={(event) => update("heroCtaLabel", event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-copper/20 px-3 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-brown">
            Destino do botão
            <input
              value={config.heroCtaUrl}
              onChange={(event) => update("heroCtaUrl", event.target.value)}
              placeholder="/sol-hair-closet/produtos"
              className="mt-1 h-10 w-full rounded-xl border border-copper/20 px-3 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-copper/15 p-4 sm:flex-row sm:items-center">
          <img
            src={config.heroImageUrl}
            alt="Prévia do banner da Home"
            className="aspect-[16/7] w-full border border-copper/10 object-cover sm:w-64"
          />
          <div className="flex-1 space-y-3">
            <input
              value={config.heroImageUrl}
              onChange={(event) => update("heroImageUrl", event.target.value)}
              aria-label="URL da imagem do banner"
              className="h-10 w-full rounded-xl border border-copper/20 px-3 text-xs"
            />
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-copper px-4 py-2 text-xs font-semibold text-copper">
              <ImagePlus size={14} /> {busy ? "Enviando…" : "Enviar novo banner"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadHero(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <OrderedSelection
            label="Categorias em destaque"
            items={categories}
            selectedIds={config.featuredCategoryIds}
            max={3}
            onChange={(ids) => update("featuredCategoryIds", ids)}
          />
          <OrderedSelection
            label="Produtos em destaque"
            items={products}
            selectedIds={config.featuredProductIds}
            max={8}
            onChange={(ids) => update("featuredProductIds", ids)}
          />
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMessage("");
            try {
              await onSave(config);
              setMessage("Página inicial salva e publicada.");
            } finally {
              setBusy(false);
            }
          }}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-copper px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Save size={14} /> Salvar página inicial
        </button>
        {message ? <p className="text-xs text-brown/70">{message}</p> : null}
      </div>
    </section>
  );
}
