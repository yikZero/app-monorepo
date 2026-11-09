/* eslint-disable onekey/no-raw-error -- Standalone CLI uses native Node errors without the application runtime. */
import {
  LOKALISE_API_BASE,
  LOKALISE_PAGE_LIMIT,
  LOKALISE_TIMEOUT_MS,
  PROJECTS,
} from './constants.mjs';

const MAX_LANGUAGE_PAGES = 20;

export function projectSpec(alias) {
  const spec = PROJECTS[alias];
  if (!spec) {
    throw new Error(
      `Unsupported --project ${alias}. Allowed: ${Object.keys(PROJECTS).join(', ')}.`,
    );
  }
  if (!spec.id) {
    const variable =
      alias === 'client'
        ? 'LOKALISE_PROJECT_ID_CLIENT (or LOKALISE_PROJECT_ID)'
        : 'LOKALISE_PROJECT_ID_SERVER';
    throw new Error(`Lokalise project is not configured. Set ${variable}.`);
  }
  return spec;
}

export function projectUrl(id) {
  return `${LOKALISE_API_BASE}/projects/${encodeURIComponent(id)}`;
}

export function languagesUrl(id, page, limit = LOKALISE_PAGE_LIMIT) {
  const url = new URL(
    `${LOKALISE_API_BASE}/projects/${encodeURIComponent(id)}/languages`,
  );
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('page', String(page));
  return url.toString();
}

export function sameLanguageSet(left, right) {
  if (
    !Array.isArray(left) ||
    !Array.isArray(right) ||
    left.length !== right.length
  ) {
    return false;
  }
  const a = new Set(left);
  const b = new Set(right);
  if (a.size !== left.length || b.size !== right.length || a.size !== b.size) {
    return false;
  }
  for (const code of a) {
    if (!b.has(code)) return false;
  }
  return true;
}

export function languageSetConflict(provided, resolved) {
  const providedSet = new Set(provided);
  const resolvedSet = new Set(resolved);
  return {
    missing: resolved.filter((code) => !providedSet.has(code)),
    extra: provided.filter((code) => !resolvedSet.has(code)),
  };
}

export async function lokaliseGetJson(
  url,
  { token, fetchFn, timeoutMs = LOKALISE_TIMEOUT_MS },
) {
  let response;
  try {
    response = await fetchFn(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Api-Token': token,
      },
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new Error('Lokalise request timed out', { cause: err });
    }
    const message = String(err?.message || err);
    if (/redirect/i.test(message)) {
      throw new Error('Lokalise request failed (redirect not allowed)', {
        cause: err,
      });
    }
    throw new Error('Lokalise request failed', { cause: err });
  }

  if (!response.ok) {
    throw new Error(`Lokalise request failed (HTTP ${response.status})`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error('Lokalise request failed (invalid JSON)');
  }
}

export async function resolveProjectLanguages({
  alias,
  token,
  fetchFn,
  timeoutMs = LOKALISE_TIMEOUT_MS,
  pageLimit = LOKALISE_PAGE_LIMIT,
} = {}) {
  const spec = projectSpec(alias);
  const projectBody = await lokaliseGetJson(projectUrl(spec.id), {
    token,
    fetchFn,
    timeoutMs,
  });
  // Verified against the live REST endpoint: the project is the response body.
  const project = projectBody;
  if (!project || typeof project !== 'object') {
    throw new Error('Lokalise project response missing project');
  }
  if (project.project_id !== spec.id) {
    throw new Error(
      `Lokalise project id mismatch for ${spec.alias}: expected ${spec.id}`,
    );
  }
  if (project.name !== spec.name) {
    throw new Error(
      `Lokalise project name mismatch for ${spec.alias}: expected ${JSON.stringify(spec.name)}`,
    );
  }
  const baseLanguage = project.base_language_iso || project.base_lang_iso;
  if (typeof baseLanguage !== 'string' || baseLanguage.trim() === '') {
    throw new Error(`Lokalise project ${spec.alias} missing base language`);
  }

  const languages = [];
  for (let page = 1; page <= MAX_LANGUAGE_PAGES; page += 1) {
    const body = await lokaliseGetJson(languagesUrl(spec.id, page, pageLimit), {
      token,
      fetchFn,
      timeoutMs,
    });
    const rows = body?.languages;
    if (!Array.isArray(rows)) {
      throw new Error('Lokalise languages response missing languages array');
    }
    for (const row of rows) {
      const code = row?.lang_iso;
      if (typeof code !== 'string' || code.trim() === '') {
        throw new Error('Lokalise languages response missing lang_iso');
      }
      languages.push(code);
    }
    if (rows.length < pageLimit) break;
    if (page === MAX_LANGUAGE_PAGES) {
      throw new Error('Lokalise languages pagination exceeded safety limit');
    }
  }

  if (languages.length === 0) {
    throw new Error(`Lokalise project ${spec.alias} returned no languages`);
  }

  const seen = new Set();
  for (const code of languages) {
    if (seen.has(code)) {
      throw new Error(`Lokalise returned duplicate language code ${code}`);
    }
    seen.add(code);
  }

  return {
    alias: spec.alias,
    id: spec.id,
    name: spec.name,
    baseLanguage,
    languages,
  };
}
