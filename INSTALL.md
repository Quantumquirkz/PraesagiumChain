# Instalación de PraesagiumChain

Para evitar errores de `node-gyp` (EPERM en `C:\Windows`), rutas UNC y “no package.json”, **todo debe ejecutarse en WSL con Node instalado dentro de WSL**, no con Node de Windows.

---

## 1. Usar terminal WSL en Cursor

El proyecto incluye configuración para que la terminal integrada sea **WSL** por defecto en Windows:

- **Archivo:** `.vscode/settings.json` → `terminal.integrated.defaultProfile.windows: "Ubuntu (WSL)"`
- Si tu distro WSL tiene otro nombre (p. ej. `Ubuntu-22.04`), cambia en ese archivo `"Ubuntu"` por el nombre de tu distro en el perfil.

**Qué hacer:** cierra las terminales abiertas, abre una **nueva** terminal en Cursor (Ctrl+` o Terminal → Nueva terminal). Debe abrirse una terminal de tipo **Ubuntu (WSL)**. El prompt debería ser algo como `usuario@equipo:~$` o `usuario@equipo:/ruta$`.

Si no ves la opción "Ubuntu (WSL)", instala la extensión **WSL** en Cursor y vuelve a abrir la terminal.

---

## 2. Node dentro de WSL

En esa terminal WSL, comprueba qué Node usas:

```bash
node -p "process.platform"
```

- Si sale **`linux`** → bien, sigue al paso 3.
- Si sale **`win32`** o da error → estás usando Node de Windows. Instala Node dentro de WSL:

**Con nvm (recomendado):**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

**Con apt:**

```bash
sudo apt update && sudo apt install -y nodejs npm
```

Vuelve a comprobar: `node -p "process.platform"` debe ser `linux`.

---

## 3. Instalar todo el proyecto

En la raíz del proyecto ejecuta **directamente con bash** (no con npm, para evitar CMD/UNC):

```bash
./scripts/install-all.sh
```

Ese script instala:

- Dependencias **raíz** (Hardhat, OpenZeppelin, Chainlink)
- Dependencias **frontend** (Next.js, Wagmi, etc.)
- Dependencias **CRE** (con `--ignore-scripts`, el postinstall `cre-setup` no está en npm público)
- **Backend Rust** (si tienes `cargo` y `build-essential` instalados). Si falta `cc` o `pkg-config`, ejecuta:
  ```bash
  sudo apt install -y build-essential pkg-config libssl-dev
  ```
  Luego instala Rust si no lo tienes: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

---

## 4. Si solo falla el frontend

Si la raíz y el resto están bien pero el frontend no termina de instalar o da errores:

```bash
./scripts/install-frontend.sh
```

o:

```bash
npm run install:frontend
```

Eso limpia `frontend/node_modules` y hace un `npm install` limpio en el frontend.

---

## 5. Comprobar que Node es el correcto

```bash
./scripts/check-node.sh
```

Debe decir algo como: `OK: Node es de Linux`.

---

## 6. Cómo ejecutar el proyecto

### Comandos de ejecución (copiar y pegar en terminal WSL)

| Componente        | Comando                               | URL                  |
|-------------------|----------------------------------------|----------------------|
| **Frontend**      | `cd frontend && npm run dev`           | http://localhost:3000 |
| **Backend (API)** | `npm run backend` o `./scripts/setup-and-run-backend.sh` | http://localhost:4000 |
| **Nodo Hardhat**  | `npm run node`                         | RPC local            |
| **Deploy local**  | `npm run deploy`                       | (tras `npm run node`) |

### Orden recomendado para desarrollo

1. **Terminal 1 — Backend:**
   ```bash
   cd /home/keru/PraesagiumChain
   npm run backend
   ```
   *(O `./scripts/setup-and-run-backend.sh` si falta build-essential/pkg-config/libssl-dev.)*

2. **Terminal 2 — Frontend:**
   ```bash
   cd /home/keru/PraesagiumChain/frontend
   npm run dev
   ```

3. Abrir **http://localhost:3000** en el navegador.

### Para probar con blockchain local

1. **Terminal 1:** `npm run node` (nodo Hardhat)
2. **Terminal 2:** `npm run deploy` (desplegar contratos)
3. **Terminal 3:** `npm run backend`
4. **Terminal 4:** `cd frontend && npm run dev`

---

## Resumen rápido

1. Abrir **nueva terminal** en Cursor (debe ser WSL).
2. Comprobar `node -p "process.platform"` → `linux`.
3. En la raíz: `./scripts/install-all.sh`.
4. Ejecutar: `npm run backend` en una terminal y `cd frontend && npm run dev` en otra.
