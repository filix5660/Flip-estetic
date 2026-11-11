import type { NextConfig } from "next";

// O Next já compila CSS global e CSS Modules nativamente.
// Não aplicar o loader do Tailwind a todos os ficheiros .css:
// isso quebra seletores de CSS Modules como :global(...).

// Cabeçalhos de segurança enviados em todas as respostas.
const cabecalhosDeSeguranca = [
  // Impede que o site seja mostrado dentro de outro (clickjacking), que
  // formulários enviem dados para fora e que a página carregue plugins.
  {
    key: "Content-Security-Policy",
    value:
      "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  // O navegador respeita o tipo de ficheiro declarado, sem adivinhar.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Não envia o endereço completo da página a outros sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // O site não usa câmara, microfone nem localização.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Depois da primeira visita, o navegador só aceita HTTPS (ignorado em localhost).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  // Não anuncia a tecnologia usada.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: cabecalhosDeSeguranca }];
  },
};

export default nextConfig;
