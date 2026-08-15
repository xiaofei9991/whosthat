export async function onRequest(context: EventContext<Env, string, Record<string, never>>): Promise<Response> {
  const url = new URL(context.request.url)
  if (url.hostname === 'www.whosthatcast.com') {
    url.hostname = 'whosthatcast.com'
    return Response.redirect(url.toString(), 301)
  }
  return context.next()
}
