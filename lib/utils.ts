// Auto-generation helpers
export function generateIQANumber(): string {
  const year = new Date().getFullYear()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `IQA${year}${random}`
}

export function generateIQRNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `IQR${year}${random}`
}
