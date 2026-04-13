type requestJsonCommands =
  | 'TitleMedium'
  | 'TitleLarge'
  | 'TitleFull'
  | 'ProgramByPID'
  | 'ProgramByCount'
  | 'ProgramByDate'
  | 'SubTitles'
  | 'ChFilter'
  | 'ChIDFilter'
  | 'TitleSearch'

interface SyoboiJsonOptions {
  Req: requestJsonCommands
  TID: string
}

interface SyoboiRssOptions {
  start: string
  end: string
  alt: 'json'
}

interface SyoboiRssResult {
  StTime: string
  EdTime: string
  LastUpdate: string
  Count: string | null
  StOffset: string
  TID: string
  PID: string
  ProgComment: string
  ChID: string
  SubTitle: string | null
  Flag: string
  Deleted: string
  Warn: string
  Revision: string
  AllDay: string
  Title: string
  ShortTitle: string
  Cat: string
  Urls: string
  ChName: string
  ChURL: string
  ChGID: string
}

interface SyoboiJsonResult {
  TID: string
  Title: string
  ShortTitle: string
  TitleYomi: string
  TitleEN: string
  Cat: string
  FirstCh: string
  FirstYear: string
  FirstMonth: string
  FirstEndYear?: any
  FirstEndMonth?: any
  TitleFlag: string
  Keywords: string
  UserPoint: string
  UserPointRank: string
  TitleViewCount: string
  Comment: string
  SubTitles: string
}

export class Syoboi {
  public async requestJSON(
    options: SyoboiJsonOptions
  ): Promise<SyoboiJsonResult> {
    const params = new URLSearchParams(
      Object.entries(options).map(
        ([k, v]) => [k, String(v)] as [string, string]
      )
    )
    const res = await fetch(`https://cal.syoboi.jp/json.php?${params.toString()}`)
    if (!res.ok) throw new Error(`Syoboi requestJSON failed: ${res.status}`)
    const data = (await res.json()) as {
      Titles: Record<string, SyoboiJsonResult>
    }
    return data.Titles[options.TID]
  }

  public async requestRSS(
    options: SyoboiRssOptions
  ): Promise<SyoboiRssResult[]> {
    const params = new URLSearchParams(
      Object.entries(options).map(
        ([k, v]) => [k, String(v)] as [string, string]
      )
    )
    const res = await fetch(`https://cal.syoboi.jp/rss2.php?${params.toString()}`)
    if (!res.ok) throw new Error(`Syoboi requestRSS failed: ${res.status}`)
    const data = (await res.json()) as { items: SyoboiRssResult[] }
    return data.items
  }
}
