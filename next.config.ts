import type { NextConfig } from "next";

// O Next já compila CSS global e CSS Modules nativamente.
// Não aplicar o loader do Tailwind a todos os ficheiros .css:
// isso quebra seletores de CSS Modules como :global(...).
const nextConfig: NextConfig = {};

export default nextConfig;
