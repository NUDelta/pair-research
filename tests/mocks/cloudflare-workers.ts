export const env = {} as Cloudflare.Env

export class DurableObject<Env = Cloudflare.Env> {
  protected ctx: DurableObjectState
  protected env: Env

  constructor(ctx: DurableObjectState, envBindings: Env) {
    this.ctx = ctx
    this.env = envBindings
  }
}
