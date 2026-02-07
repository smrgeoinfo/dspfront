import axios from 'axios'
import User from '~/models/user.model'

const CATALOG_API = '/api/catalog'

export interface CatalogRecord {
  id: string
  profile: number
  profile_name: string
  title: string
  creators: string
  identifier: string
  status: string
  jsonld: any
  created_at: string
  updated_at: string
}

export async function fetchMyRecords(): Promise<CatalogRecord[]> {
  const resp = await axios.get(`${CATALOG_API}/records/`, {
    params: { mine: 'true', access_token: User.$state.orcidAccessToken },
  })
  return resp.data.results
}

export async function deleteRecord(id: string): Promise<void> {
  await axios.delete(`${CATALOG_API}/records/${id}/`, {
    params: { access_token: User.$state.orcidAccessToken },
  })
}
