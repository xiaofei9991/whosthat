export type MediaType = 'movie' | 'tv'
export type StaticPageId = 'about' | 'faq' | 'privacy'
export type SeasonOrAll = number | 'all'
export type EpisodeOrAll = number | 'all'

export type Route =
  | { type: 'home' }
  | { type: 'title'; mediaType: MediaType; id: number }
  | { type: 'season'; id: number; season: number }
  | { type: 'whoplays'; mediaType: MediaType; mediaId: number; personId: number }
  | { type: 'static'; page: StaticPageId }

export type Navigate = (path: string) => void

export interface TmdbTitle {
  id: number
  media_type?: 'movie' | 'tv' | 'person'
  title?: string
  name?: string
  poster_path?: string | null
  release_date?: string
  first_air_date?: string
  popularity?: number
  vote_count?: number
  character?: string
  credit_id?: string
}

export interface TmdbRole {
  character: string
}

export interface TmdbCastMember {
  id: number
  name: string
  character?: string
  profile_path?: string | null
  roles?: TmdbRole[]
  total_episode_count?: number
  episodes?: number
  credit_id?: string
}

export interface TmdbSeasonInfo {
  season_number: number
  episode_count: number
}

export interface TmdbDetails extends TmdbTitle {
  number_of_seasons?: number
  credits?: { cast: TmdbCastMember[] }
  aggregate_credits?: { cast: TmdbCastMember[] }
  seasons?: TmdbSeasonInfo[]
}

export interface TmdbPerson {
  id: number
  name: string
  birthday?: string | null
  deathday?: string | null
  place_of_birth?: string | null
  profile_path?: string | null
  combined_credits?: { cast: TmdbTitle[] }
}

export interface TmdbListResponse<T> {
  results: T[]
}

export interface TmdbSeasonCredits {
  cast?: TmdbCastMember[]
}

export interface TmdbEpisodeCredits {
  cast?: TmdbCastMember[]
  guest_stars?: TmdbCastMember[]
}

export interface ShowProgress {
  season: SeasonOrAll
  episode: EpisodeOrAll
  name: string
  poster_path: string | null
  updatedAt: number
}

export interface ListedProgress extends ShowProgress {
  id: number
}

export interface RecentSearch {
  media_type: MediaType | 'person' | undefined
  id: number
  title?: string
  name?: string
}
