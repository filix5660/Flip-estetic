import { BotaoLink } from "@/components/ui";

export default function NaoEncontrado() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="text-center">
        <p className="text-sm font-semibold tracking-[0.2em] text-acento-600">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Página não encontrada</h1>
        <p className="mt-2 text-suave">O endereço pode estar errado ou o negócio mudou de link.</p>
        <BotaoLink href="/" className="mt-6">
          Voltar ao início
        </BotaoLink>
      </div>
    </main>
  );
}
