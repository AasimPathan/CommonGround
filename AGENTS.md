<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep all authenticated product pages under the shared `_authenticated` route and derive navigation from the separately stored account role, because one secure shell must serve creator, business, manager, and reviewer experiences without duplicated layouts.

- Keep initiative permissions in the pure shared permissions module so interface visibility and database-enforced workflows remain aligned.

- Keep the root URL as a public landing page that forwards signed-in users to their workspace client-side, because visitors need an introduction while members need direct access.

- Keep marketplace state transitions and shortlist limits database-enforced, because both creator and business interfaces must reflect the same secure workflow.

- Keep Instagram lookup throttling in the shared pure policy module and use typed limit results across RPC; browser guards and per-worker single-flight protection prevent accidental duplicate paid requests without claiming cross-worker global enforcement.
- Keep provider normalization and confirmation patches in a pure shared module; signed previews use a dedicated app signing secret, and only authenticated server handlers read provider credentials, so API replacement cannot overwrite creator-selected fields or leak credentials.
- Return typed provider and transport failures from Instagram lookups, and log only upstream status, known request-host environment, diagnostic version, stage, elapsed time and allowlisted error categories/codes; raw errors, response bodies and request headers can expose credentials. Unknown hosts remain unknown, and local tests never establish hosted connectivity.
- Server-side fetch must use redirect "manual" (and reject 3xx) rather than "error", because the hosted Worker runtime throws on "error" before sending, while local Node accepts it.
