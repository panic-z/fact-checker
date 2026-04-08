/**
 * Custom Jest test environment that extends jsdom with Fetch API globals
 * (Response, Request, Headers, ReadableStream) which are available in Node 18+
 * but not automatically exposed in jsdom's virtual browser context.
 */
import JSDOMEnvironment from 'jest-environment-jsdom'
import type { JestEnvironmentConfig, EnvironmentContext } from '@jest/environment'

export default class JSDOMFetchEnvironment extends JSDOMEnvironment {
  constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
    super(config, context)
  }

  async setup() {
    await super.setup()

    // Expose Node 18+ fetch globals into the jsdom window scope
    const nodeGlobal = (globalThis as unknown as Record<string, unknown>)

    // Grab from the outer Node process global (which has these natively in Node 18+)
    const { ReadableStream, TransformStream, WritableStream, Response, Request, Headers, fetch } =
      nodeGlobal as {
        ReadableStream: typeof globalThis.ReadableStream
        TransformStream: unknown
        WritableStream: unknown
        Response: typeof globalThis.Response
        Request: typeof globalThis.Request
        Headers: typeof globalThis.Headers
        fetch: typeof globalThis.fetch
      }

    if (!this.global.ReadableStream && ReadableStream) {
      this.global.ReadableStream = ReadableStream
    }
    if (TransformStream && !(this.global as Record<string, unknown>).TransformStream) {
      ;(this.global as Record<string, unknown>).TransformStream = TransformStream
    }
    if (WritableStream && !(this.global as Record<string, unknown>).WritableStream) {
      ;(this.global as Record<string, unknown>).WritableStream = WritableStream
    }
    if (!this.global.Response && Response) {
      this.global.Response = Response
    }
    if (!this.global.Request && Request) {
      this.global.Request = Request
    }
    if (!this.global.Headers && Headers) {
      this.global.Headers = Headers
    }
    if (!this.global.fetch && fetch) {
      this.global.fetch = fetch
    }
  }
}
