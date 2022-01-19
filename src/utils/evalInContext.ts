/**
 * Eval that's scoped, to:
 * 1) limit the chances that in eval script will be able to access undesired variables
 * 2) provide a place where the eval can output the results (`context`).
 */
export const evalInContext = (script: string, context: Record<string, any> = {}): Record<string, any> => {
  eval(script);
  return context;
};
