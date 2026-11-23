import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="grid min-h-[60dvh] place-items-center text-center">
      <div>
        <p className="label mb-4">Erro 404</p>
        <h1 className="display text-[32px]">Página não encontrada</h1>
        <p className="mt-2 text-muted">O endereço não existe ou foi movido.</p>
        <Link to="/hoje" className="mt-6 inline-block text-sm text-accent-text hover:underline">
          Voltar para hoje
        </Link>
      </div>
    </div>
  );
}
