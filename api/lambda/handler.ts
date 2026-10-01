import { route } from './router.js';
import type { LambdaEvent, LambdaResponse } from './adapter.js';

export async function handler(event: LambdaEvent): Promise<LambdaResponse> {
  return route(event);
}
