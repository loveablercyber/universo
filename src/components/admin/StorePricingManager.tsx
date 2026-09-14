import { useEffect, useState } from "react";
import { AlertTriangle, Calculator, Plus, Save, Trash2 } from "lucide-react";
import type {
  PricingCostItem,
  PricingInput,
  PricingPercentages,
  ProductPricingResult,
} from "@/lib/store-pricing-calculator";

type ProductOption = {
  id: string;
  name: string;
  slug: string;
  price: number;
  wholesaleEligible: boolean;
};
type PricingResult = ProductPricingResult;
type HistoryItem = {
  id: string;
  productName?: string;
  calculationName?: string;
  technicalPrice: number;
  suggestedPrice: number;
  chosenPrice?: number;
  createdAt: string;
  createdByName?: string;
};

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const defaultInput: PricingInput = {
  purchaseTotal: 0,
  purchasedQuantity: 1,
  purchasedPieceGrams: 100,
  soldGrams: 100,
  wholesaleQuantity: 15,
};

export function StorePricingManager() {
  const [settings, setSettings] = useState<PricingPercentages | null>(null);
  const [costs, setCosts] = useState<PricingCostItem[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [input, setInput] = useState<PricingInput>(defaultInput);
  const [productId, setProductId] = useState("");
  const [calculationName, setCalculationName] = useState("");
  const [result, setResult] = useState<PricingResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/store-pricing");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Falha ao carregar precificação.");
      setSettings(data.settings);
      setCosts(data.costs || []);
      setProducts(data.products || []);
      setHistory(data.history || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar precificação.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const post = async (body: unknown) => {
    const res = await fetch("/api/admin/store-pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { res, data };
  };

  const calculate = async (
    action: "calculate" | "save-calculation" | "apply-price",
    confirmLoss = false,
  ) => {
    setMessage("");
    const { res, data } = await post({
      action,
      input,
      productId: productId || null,
      calculationName: calculationName || null,
      confirmLoss,
    });
    if (
      res.status === 409 &&
      data.requiresConfirmation &&
      window.confirm(`${data.message}\n\nDeseja aplicar mesmo assim?`)
    )
      return calculate(action, true);
    if (!res.ok) {
      setMessage(data.message || "Não foi possível calcular.");
      return;
    }
    setResult(data.result);
    setMessage(
      action === "calculate"
        ? "Cálculo atualizado."
        : action === "apply-price"
          ? "Preço aplicado ao produto e cálculo registrado."
          : "Cálculo salvo no histórico.",
    );
    if (action !== "calculate") void load();
  };

  if (loading)
    return (
      <div className="rounded-3xl bg-white p-10 text-center text-sm text-brown/60">
        Carregando custos e histórico…
      </div>
    );
  if (!settings)
    return (
      <div className="rounded-3xl bg-red-50 p-6 text-sm text-red-700">
        {message || "Configuração de preços indisponível. Execute a migração 028."}
      </div>
    );

  const settingFields: Array<[keyof PricingPercentages, string]> = [
    ["retailFixedPct", "Custos fixos varejo (%)"],
    ["retailAdsPct", "Anúncios varejo (%)"],
    ["retailReservePct", "Reserva varejo (%)"],
    ["retailProfitPct", "Lucro desejado sobre custo (%)"],
    ["wholesaleFixedPct", "Custos fixos atacado (%)"],
    ["wholesaleReservePct", "Reserva atacado (%)"],
    ["wholesaleAcquisitionPct", "Aquisição atacado (%)"],
    ["warningMarginPct", "Margem mínima de alerta (%)"],
  ];

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-xl border border-copper/20 bg-cream/40 px-4 py-3 text-xs text-brown">
          {message}
        </div>
      )}
      <section className="rounded-3xl border border-copper/10 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl text-brown">Premissas protegidas</h3>
            <p className="text-xs text-brown/55">
              Visíveis apenas para usuários autorizados da loja.
            </p>
          </div>
          <button
            onClick={async () => {
              const { res, data } = await post({ action: "save-settings", settings });
              setMessage(res.ok ? "Percentuais salvos." : data.message);
            }}
            className="flex items-center gap-2 rounded-xl bg-copper px-4 py-2 text-xs font-semibold text-white"
          >
            <Save size={14} />
            Salvar percentuais
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {settingFields.map(([key, label]) => (
            <label key={key} className="text-xs text-brown/70">
              {label}
              <input
                type="number"
                step="0.01"
                value={settings[key]}
                onChange={(e) => setSettings({ ...settings, [key]: Number(e.target.value) })}
                className="mt-1 h-10 w-full rounded-xl border border-copper/20 px-3 text-sm"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-copper/10 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl text-brown">Itens de custo</h3>
            <p className="text-xs text-brown/55">
              Varejo por unidade, atacado por unidade e despesas por pedido.
            </p>
          </div>
          <button
            onClick={() =>
              setCosts([
                ...costs,
                {
                  scope: "retail_unit",
                  code: `novo_custo_${Date.now()}`,
                  description: "Novo custo",
                  amount: 0,
                  active: true,
                  sortOrder: costs.length * 10,
                },
              ])
            }
            className="flex items-center gap-1 text-xs font-semibold text-copper"
          >
            <Plus size={14} />
            Adicionar
          </button>
        </div>
        <div className="space-y-2">
          {costs.map((cost, index) => (
            <div
              key={cost.id || cost.code}
              className="grid gap-2 rounded-xl bg-cream/25 p-3 sm:grid-cols-[150px_1fr_120px_80px_40px]"
            >
              <select
                value={cost.scope}
                onChange={(e) =>
                  setCosts(
                    costs.map((c, i) =>
                      i === index ? { ...c, scope: e.target.value as PricingCostItem["scope"] } : c,
                    ),
                  )
                }
                className="h-9 rounded-lg border border-copper/15 px-2 text-xs"
              >
                <option value="retail_unit">Varejo/unidade</option>
                <option value="wholesale_unit">Atacado/unidade</option>
                <option value="wholesale_order">Atacado/pedido</option>
              </select>
              <input
                value={cost.description}
                onChange={(e) =>
                  setCosts(
                    costs.map((c, i) => (i === index ? { ...c, description: e.target.value } : c)),
                  )
                }
                className="h-9 rounded-lg border border-copper/15 px-2 text-xs"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={cost.amount}
                onChange={(e) =>
                  setCosts(
                    costs.map((c, i) =>
                      i === index ? { ...c, amount: Number(e.target.value) } : c,
                    ),
                  )
                }
                className="h-9 rounded-lg border border-copper/15 px-2 text-xs"
              />
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={cost.active}
                  onChange={(e) =>
                    setCosts(
                      costs.map((c, i) => (i === index ? { ...c, active: e.target.checked } : c)),
                    )
                  }
                />
                Ativo
              </label>
              <button
                type="button"
                aria-label={`Excluir custo ${cost.description}`}
                onClick={async () => {
                  if (cost.id) {
                    const { res, data } = await post({ action: "delete-cost", id: cost.id });
                    if (!res.ok) {
                      setMessage(data.message || "Falha ao excluir custo.");
                      return;
                    }
                  }
                  setCosts((current) => current.filter((_, itemIndex) => itemIndex !== index));
                  setMessage("Item de custo removido.");
                }}
                className="grid h-9 w-9 place-items-center rounded-lg text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={async () => {
            for (const cost of costs) {
              const { res, data } = await post({ action: "save-cost", cost });
              if (!res.ok) {
                setMessage(data.message);
                return;
              }
            }
            setMessage("Custos salvos.");
            void load();
          }}
          className="mt-4 rounded-xl border border-copper px-4 py-2 text-xs font-semibold text-copper"
        >
          Salvar todos os custos
        </button>
      </section>

      <section className="rounded-3xl border border-copper/10 bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 font-serif text-xl text-brown">
          <Calculator size={20} />
          Calculadora de precificação
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["purchaseTotal", "Compra total (R$)"],
              ["purchasedQuantity", "Quantidade comprada"],
              ["purchasedPieceGrams", "Gramas por peça"],
              ["soldGrams", "Gramas vendidas"],
              ["chosenPrice", "Preço escolhido (opcional)"],
              ["wholesaleQuantity", "Quantidade simulada no atacado"],
            ] as Array<[keyof PricingInput, string]>
          ).map(([key, label]) => (
            <label key={key} className="text-xs text-brown/70">
              {label}
              <input
                type="number"
                min="0"
                step="0.01"
                value={input[key] ?? ""}
                onChange={(e) =>
                  setInput({
                    ...input,
                    [key]: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className="mt-1 h-10 w-full rounded-xl border border-copper/20 px-3 text-sm"
              />
            </label>
          ))}
          <label className="text-xs text-brown/70">
            Produto para aplicar
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-copper/20 px-3 text-sm"
            >
              <option value="">Sem vínculo</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {money(p.price)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-brown/70">
            Nome do cálculo
            <input
              value={calculationName}
              onChange={(e) => setCalculationName(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-copper/20 px-3 text-sm"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => void calculate("calculate")}
            className="rounded-xl bg-brown px-4 py-2 text-xs font-semibold text-white"
          >
            Calcular
          </button>
          <button
            onClick={() => void calculate("save-calculation")}
            className="rounded-xl border border-copper px-4 py-2 text-xs font-semibold text-copper"
          >
            Salvar cálculo
          </button>
          <button
            disabled={!productId}
            onClick={() => void calculate("apply-price")}
            className="rounded-xl bg-copper px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            Aplicar preço sugerido/escolhido
          </button>
        </div>
        {result && (
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <ResultCard
              title="Varejo"
              lines={[
                ["Custo direto", result.retail.directCost],
                ["Preço técnico", result.retail.technicalPrice],
                ["Preço sugerido", result.retail.suggestedPrice],
                ["Preço escolhido", result.retail.chosenPrice],
                ["Lucro líquido", result.retail.profit],
                ["Margem líquida", `${result.retail.netMarginPct}%`],
              ]}
            />
            <WholesaleCard label="Atacado 40%" simulation={result.wholesale.fortyPercent} />
            <WholesaleCard label="Atacado 50%" simulation={result.wholesale.fiftyPercent} />
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-copper/10 bg-white p-6 shadow-sm">
        <h3 className="font-serif text-xl text-brown">Histórico de cálculos</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-copper/10 text-brown/50">
                <th className="py-2">Data</th>
                <th>Produto/cálculo</th>
                <th>Técnico</th>
                <th>Sugerido</th>
                <th>Escolhido</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-b border-copper/5">
                  <td className="py-3">{new Date(item.createdAt).toLocaleString("pt-BR")}</td>
                  <td>{item.productName || item.calculationName || "Sem vínculo"}</td>
                  <td>{money(item.technicalPrice)}</td>
                  <td>{money(item.suggestedPrice)}</td>
                  <td>{item.chosenPrice ? money(item.chosenPrice) : "—"}</td>
                  <td>{item.createdByName || "Administrador"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ResultCard({ title, lines }: { title: string; lines: Array<[string, number | string]> }) {
  return (
    <div className="rounded-2xl border border-copper/15 p-4">
      <h4 className="font-semibold text-brown">{title}</h4>
      <dl className="mt-3 space-y-2 text-xs">
        {lines.map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <dt className="text-brown/55">{label}</dt>
            <dd className="font-semibold text-brown">
              {typeof value === "number" ? money(value) : value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
function WholesaleCard({
  label,
  simulation,
}: {
  label: string;
  simulation: PricingResult["wholesale"]["fortyPercent"];
}) {
  const bad = simulation.health === "loss";
  const tone = bad
    ? "border-red-300 bg-red-50"
    : simulation.health === "warning"
      ? "border-amber-300 bg-amber-50"
      : "border-green-200 bg-green-50/40";
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <h4 className="flex items-center gap-2 font-semibold text-brown">
        {bad && <AlertTriangle size={15} className="text-red-600" />}
        {label}
      </h4>
      <dl className="mt-3 space-y-2 text-xs">
        {[
          ["Receita/un.", money(simulation.unitRevenue)],
          ["Custo/un.", money(simulation.unitCost)],
          ["Lucro/un.", money(simulation.unitProfit)],
          ["Margem", `${simulation.netMarginPct}%`],
          ["Lucro total", money(simulation.totalProfit)],
        ].map(([a, b]) => (
          <div key={a} className="flex justify-between">
            <dt className="text-brown/55">{a}</dt>
            <dd className="font-semibold text-brown">{b}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
