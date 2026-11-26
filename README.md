# WED3D — web

Recorrido 3D (Vite + React + Three.js / React Three Fiber).

## Arrancar
```
npm install
npm run dev
```
Abrí http://localhost:5173 (también aparece una URL de red para probar desde el celular en el mismo wifi).

## Estructura
- `src/data/puntos.ts` — puntos de interés (texto + posición de cámara)
- `src/scene/Experience.tsx` — luces, cielo, sombras
- `src/scene/PlaceholderHouse.tsx` — maqueta provisoria
- `src/scene/Model.tsx` — carga un .glb real desde `public/models/`
- `src/ui/` — panel y pantalla de carga

## Usar un modelo real
1. Poné el archivo en `public/models/casa.glb`
2. En `Experience.tsx` reemplazá `<PlaceholderHouse />` por `<Model url="/models/casa.glb" />`
