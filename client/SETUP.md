# Client setup (overlay method)

1. Create the Vite app, then install packages:
   ```bash
   npm create vite@latest client -- --template react
   cd client
   npm i react-router-dom axios @reduxjs/toolkit react-redux @tanstack/react-query
   npm i -D tailwindcss @tailwindcss/vite
   ```
2. Copy `src/`, `vite.config.js` and `.env.example` from this starter over the generated files
   (overwrite `src/main.jsx`, `src/App.jsx`, `src/index.css`, `vite.config.js`).
3. Delete `src/App.css` and the default assets.
4. From PowerShell, run these separately:
   ```powershell
   Copy-Item .env.example .env
   npm run dev
   ```
