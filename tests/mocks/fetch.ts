/**
 * Creates a mock Fetch Response error
 */
export function createFetchResponse(
  status: number,
  statusText = 'Error',
  body: any = { message: 'Error message' }
): Response {
  const blob = new Blob(
    [typeof body === 'string' ? body : JSON.stringify(body)],
    { type: 'application/json' }
  );

  return new Response(blob, {
    status,
    statusText,
    headers: new Headers({
      'Content-Type': 'application/json'
    })
  });
}

/**
 * Creates a mock Fetch error
 */
export function createFetchError(
  message = 'Network error',
  properties: Record<string, any> = {}
): Error {
  const error = new Error(message);
  Object.assign(error, properties);
  return error;
}

/**
 * Creates a mock AbortError for fetch
 */
export function createAbortError(): Error {
  const error = new Error('The operation was aborted');
  error.name = 'AbortError';
  return error;
}