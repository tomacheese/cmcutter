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
  public getRecordeds(): Promise<EPGRecorded[]> {
    return this.fetchAllRecords(
      'getRecordeds',
      'http://localhost:8888/api/recorded?isHalfWidth=false'
    )
  }

  public getRecordings(): Promise<EPGRecorded[]> {
    return this.fetchAllRecords(
      'getRecordings',
      'http://localhost:8888/api/recording?isHalfWidth=true'
    )
  }

  private async fetchAllRecords(
    name: string,
    url: string
  ): Promise<EPGRecorded[]> {
    const limit = 300
    const all: EPGRecorded[] = []
    for (;;) {
      const res = await fetch(`${url}&limit=${limit}&offset=${all.length}`)
      if (!res.ok) throw new Error(`EPGStation ${name} failed: ${res.status}`)
      const { records, total } = (await res.json()) as {
        records: EPGRecorded[]
        total: number
      }
      all.push(...records)
      if (records.length === 0 || all.length >= total) return all
    }
  }

  public async getChannels(): Promise<EPGChannel[]> {
    const res = await fetch('http://localhost:8888/api/channels')
    if (!res.ok) throw new Error(`EPGStation getChannels failed: ${res.status}`)
    return (await res.json()) as EPGChannel[]
  }
}
