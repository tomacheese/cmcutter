const metadataWaitDuration = 1000 * 60 * 60 * 24 * 3

export function getSyoboiFileName(
  title: string,
  count: string | null,
  subtitle: string | null,
  recordedEndAt: number,
  now = Date.now()
): string | null {
  const hasMissingMetadata = count === null || subtitle === null
  const elapsedTime = now - recordedEndAt
  return hasMissingMetadata && elapsedTime < metadataWaitDuration
    ? null
    : `${title} 第${count}話 ${subtitle}`
}
