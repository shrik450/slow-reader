/**
 * Exhaustiveness helper for discriminated-union switches.
 *
 * Use in the `default:` branch of every switch over a discriminated union.
 * If a new case is added to the union and the switch isn't updated, the call
 * to `assertNever(x)` becomes a type error at compile time. At runtime it
 * throws, so unreachable code becomes a loud failure instead of silent
 * fall-through.
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
