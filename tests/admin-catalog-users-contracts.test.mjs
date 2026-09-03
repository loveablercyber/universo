import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const storeApi = await readFile("src/routes/api.admin.store.ts", "utf8");
const storeManager = await readFile("src/components/admin/StoreManager.tsx", "utf8");
const usersApi = await readFile("src/routes/api.admin.users.ts", "utf8");
const userManager = await readFile("src/components/admin/UserManager.tsx", "utf8");

test("cadastro de produto usa upload de arquivo e preserva a imagem ao editar", () => {
  assert.match(storeManager, /type="file"/);
  assert.match(storeManager, /fetch\("\/api\/admin\/media"/);
  assert.match(storeManager, /setImageUrl\(payload\.publicUrl\)/);
  assert.match(
    storeManager,
    /const \[imageUrl, setImageUrl\] = useState\(product\?\.image \|\| ""\)/,
  );
  assert.doesNotMatch(storeManager, /URL da Imagem Principal/);
});

test("produto pode ser removido sem apagar os itens dos pedidos históricos", () => {
  assert.match(storeManager, /action: "delete-product"/);
  assert.match(storeApi, /action: z\.literal\("delete-product"\)/);
  assert.match(storeApi, /DELETE FROM universe\.store_products/);
  assert.match(storeApi, /store\.product\.deleted/);
  assert.match(storeApi, /Produto não encontrado/);
});

test("remoção de usuário é definitiva e possui proteções administrativas", () => {
  assert.match(userManager, /handleAction\("delete-user"\)/);
  assert.match(userManager, /Remover Usuário Definitivamente/);
  assert.match(usersApi, /action: z\.literal\("delete-user"\)/);
  assert.match(usersApi, /Você não pode remover a própria conta/);
  assert.match(usersApi, /Não é possível remover o último administrador ativo/);
  assert.match(usersApi, /delete from universe\.users where id=\$1/);
  assert.match(usersApi, /delete from public\.carolsol_sso_codes where identity_user_id=\$1/);
  assert.match(usersApi, /delete from auth\.users where id=\$1/);
  assert.match(usersApi, /user\.deleted/);
});
