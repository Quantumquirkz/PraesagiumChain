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

# En la raíz del proyecto ejecuta (directamente con bash, no con npm):
#
#   ./scripts/install-all.sh
#
# No uses "npm run install:all" si en WSL tu npm es el de Windows (falla con CMD/UNC).

Ese script instala:

- Dependencias **raíz** (Hardhat, OpenZeppelin, Chainlink)
- Dependencias **frontend** (Next.js, Wagmi, etc.)
- Dependencias **CRE** (con `--ignore-scripts`, el postinstall `cre-setup` no está en npm público)
- **Backend Rust** (si tienes `cargo` instalado)

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

## 6. Cómo arrancar

- **Frontend:** `cd frontend && npm run dev` → http://localhost:3000  
- **Nodo Hardhat local:** `npm run node`  
- **Backend (tras tener Hardhat en marcha):** `npm run backend`

---

## Resumen rápido

1. Abrir **nueva terminal** en Cursor (debe ser WSL).
2. Comprobar `node -p "process.platform"` → `linux`.
3. En la raíz: `./scripts/install-all.sh` (o `npm run install:all`).
4. Arrancar: `cd frontend && npm run dev`.
