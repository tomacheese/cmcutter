import axios from 'axios'

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
    const response = await axios.get<{
      Titles: Record<string, SyoboiJsonResult>
    }>('https://cal.syoboi.jp/json.php', {
      params: options,
    })
    return response.data.Titles[options.TID]
  }

  public async requestRSS(
    options: SyoboiRssOptions
  ): Promise<SyoboiRssResult[]> {
    const response = await axios.get<{
      items: SyoboiRssResult[]
    }>('https://cal.syoboi.jp/rss2.php', {
      params: options,
    })

    return response.data.items
  }
}
