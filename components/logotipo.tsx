/**
 * Logótipo do Flip: um "F" claro sobre um quadrado escuro, com um ponto
 * dourado que lembra uma marcação na agenda.
 * O mesmo desenho está em app/icon.svg (ícone do separador do browser).
 */
export default function Logotipo({ tamanho = 34 }: { tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="16" fill="#29251f" />
      <rect x="19" y="15" width="9" height="34" rx="2.5" fill="#f5f2ed" />
      <rect x="19" y="15" width="27" height="9" rx="2.5" fill="#f5f2ed" />
      <rect x="19" y="29" width="19" height="8" rx="2.5" fill="#f5f2ed" />
      <circle cx="45" cy="44" r="5.5" fill="#c9a27e" />
    </svg>
  );
}
