@AGENTS.md

## Claude-only notes

- The built-in browser pane stops rendering after scripted navigation; front the tab before measuring ad viewability, or use a headless Playwright script from the scratchpad.
- For live ad checks, accept the site's own cookie banner in the test browser (or seed the `icoffio_cookie_consent` record in a throwaway Playwright context); never fake TCF.
