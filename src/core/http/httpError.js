// Normalizes any axios/network error into a consistent Error object so the
// rest of the app never has to dig through axios internals.
export class HttpError extends Error {
  constructor(message, { status = null, data = null, original = null, isTimeout = false } = {}) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.data = data
    this.original = original
    this.isTimeout = isTimeout
  }
}

export const normalizeHttpError = (error) => {
  if (error instanceof HttpError) return error

  // The server responded with a non-2xx status.
  if (error.response) {
    const { status, data } = error.response
    const message =
      data?.message ||
      data?.error ||
      `Request failed with status ${status}.`
    return new HttpError(message, { status, data, original: error })
  }

  // The client gave up waiting before a response arrived. The server may
  // still finish processing the request (e.g. a slow MCP/LLM round trip).
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new HttpError(
      'The assistant is taking longer than expected to respond. It may still finish in the background — check your conversation history in a moment.',
      { original: error, isTimeout: true },
    )
  }

  // The request was made but no response was received.
  if (error.request) {
    return new HttpError('Could not connect to the server. Please check your connection.', {
      original: error,
    })
  }

  // Something happened while setting up the request.
  return new HttpError(error.message || 'Unexpected error.', { original: error })
}
