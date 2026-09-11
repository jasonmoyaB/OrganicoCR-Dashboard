import { useLogout } from "@/features/auth/hooks/use-logout";

interface Props {
  email: string;
}

export function AppHeader({ email }: Props) {
  const { salir, saliendo } = useLogout();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-4">
        <span className="font-semibold text-neutral-900">OrganicoCR</span>

        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-500">{email}</span>
          <button
            type="button"
            onClick={salir}
            disabled={saliendo}
            className="rounded border border-neutral-300 px-3 py-1 text-sm text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
