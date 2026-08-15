import { renderPage } from './_lib/page'

export async function onRequest(context: EventContext<Env, string, Record<string, never>>): Promise<Response> {
  return renderPage(context)
}
