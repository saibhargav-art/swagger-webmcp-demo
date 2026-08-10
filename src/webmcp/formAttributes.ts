export function webMcpFormProps(toolname: string, tooldescription: string, autosubmit = false): Record<string, string> {
  return {
    toolname,
    tooldescription,
    ...(autosubmit ? { toolautosubmit: 'true' } : {}),
  };
}

export function webMcpFieldProps(name: string, toolparamdescription: string): Record<string, string> {
  return {
    name,
    toolparamdescription,
  };
}
