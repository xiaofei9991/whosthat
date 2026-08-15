import { renderPage } from './_lib/page.js'

export async function onRequest(context) {
  return renderPage(context)
}
