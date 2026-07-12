interface EPGVideoFile {
  id: number
  name: string
  filename: string
  type: string
  size: number
}

export interface EPGRecorded {
  id: number
  channelId: number
  startAt: number
  endAt: number
  name: string
  isRecording: boolean
  isEncoding: boolean
  isProtected: boolean
  ruleId: number
  programId: number
  description: string
  extended: string
  rawExtended: any
  genre1: number
  subGenre1: number
  videoType: string
  videoResolution: string
  videoStreamContent: number
  videoComponentType: number
  audioSamplingRate: number
  audioComponentType: number
  thumbnails: number[]
  videoFiles: EPGVideoFile[]
}

export interface EPGChannel {
  id: number
  serviceId: number
  networkId: number
  name: string
  halfWidthName: string
  hasLogoData: boolean
  channelType: string
  channel: string
}

export class EPGStation {
  public async getRecordeds(): Promise<EPGRecorded[]> {
    const response = await fetch(
      'http://localhost:8888/api/recorded?isHalfWidth=false&limit=300'
    )
    if (!response.ok)
      throw new Error(`EPGStation getRecordeds failed: ${response.status}`)
    return ((await response.json()) as { records: EPGRecorded[] }).records
  }

  public async getRecordings(): Promise<EPGRecorded[]> {
    const response = await fetch(
      'http://localhost:8888/api/recording?&isHalfWidth=true&limit=300'
    )
    if (!response.ok)
      throw new Error(`EPGStation getRecordings failed: ${response.status}`)
    return ((await response.json()) as { records: EPGRecorded[] }).records
  }

  public async getChannels(): Promise<EPGChannel[]> {
    const response = await fetch('http://localhost:8888/api/channels')
    if (!response.ok)
      throw new Error(`EPGStation getChannels failed: ${response.status}`)
    return (await response.json()) as EPGChannel[]
  }
}
