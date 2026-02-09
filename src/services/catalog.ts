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

export interface UserInfo {
  orcid: string
  name: string
  first_name: string
  last_name: string
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

/**
 * Fetch the authenticated user's profile info (name, ORCID) from the catalog API.
 */
export async function fetchUserInfo(): Promise<UserInfo | null> {
  try {
    const resp = await axios.get(`${CATALOG_API}/me/`, {
      params: { access_token: User.$state.orcidAccessToken },
    })
    return resp.data
  }
  catch (e) {
    console.error('Failed to fetch user info:', e)
    return null
  }
}

/**
 * Generate a 32-character hex hash with '#' prefix.
 * Uses DOI if available, otherwise falls back to title.
 */
export async function generateRecordId(data: any): Promise<string> {
  const doi = extractDoi(data)
  const input = doi || data['schema:name'] || ''
  if (!input)
    return ''

  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(input))
  const hex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `#${hex.substring(0, 32)}`
}

/**
 * Extract DOI from schema:identifier if present.
 */
function extractDoi(data: any): string | null {
  const id = data['schema:identifier']
  if (!id)
    return null

  // Object form with propertyID
  if (typeof id === 'object' && id['schema:propertyID']) {
    const propId = id['schema:propertyID'].toLowerCase()
    if (propId.includes('doi'))
      return id['schema:value'] || id['schema:url'] || null
  }

  // String form that looks like a DOI
  if (typeof id === 'string' && /10\.\d+\//.test(id))
    return id

  return null
}

/**
 * Auto-populate required metadata fields on form load so validation passes.
 * Sets temporary @id, schema:subjectOf.@id, schema:subjectOf.schema:about,
 * and schema:subjectOf.schema:sdDatePublished with initial values.
 * These get overwritten with proper values on save via populateOnSave().
 */
export function populateOnLoad(data: any): void {
  // Generate a temporary @id from a random value
  const tempId = `#${crypto.randomUUID().replace(/-/g, '')}`
  if (!data['@id'])
    data['@id'] = tempId

  // Set dateModified to today if not set
  if (!data['schema:dateModified'])
    data['schema:dateModified'] = new Date().toISOString().split('T')[0]

  if (!data['schema:subjectOf'])
    data['schema:subjectOf'] = {}

  const subjectOf = data['schema:subjectOf']

  // Set metadata record @id (required by metaMetadata schema)
  if (!subjectOf['@id'])
    subjectOf['@id'] = `${data['@id']}_metadata`

  // Set schema:about to reference the record's @id (required)
  if (!subjectOf['schema:about'])
    subjectOf['schema:about'] = { '@id': data['@id'] }

  // Set sdDatePublished to today
  if (!subjectOf['schema:sdDatePublished'])
    subjectOf['schema:sdDatePublished'] = new Date().toISOString().split('T')[0]

  // Set _distributionType from @type for each distribution item
  for (const dist of data['schema:distribution'] || []) {
    if (dist && typeof dist === 'object') {
      if (!dist._distributionType) {
        const types = Array.isArray(dist['@type']) ? dist['@type'] : [dist['@type']]
        dist._distributionType = types.includes('schema:WebAPI') ? 'Web API' : 'Data Download'
      }

      // Unwrap encodingFormat array to single string for form binding
      if (Array.isArray(dist['schema:encodingFormat']))
        dist['schema:encodingFormat'] = dist['schema:encodingFormat'][0] || ''

      // Unwrap hasPart items' encodingFormat arrays too
      for (const part of dist['schema:hasPart'] || []) {
        if (part && typeof part === 'object' && Array.isArray(part['schema:encodingFormat']))
          part['schema:encodingFormat'] = part['schema:encodingFormat'][0] || ''
      }
    }
  }
}

/**
 * Auto-populate maintainer in schema:subjectOf with the logged-in user's info.
 * Called after loading defaults for a new record.
 */
export function populateMaintainer(data: any, userInfo: UserInfo): void {
  if (!data['schema:subjectOf'])
    data['schema:subjectOf'] = {}

  const subjectOf = data['schema:subjectOf']

  // Only populate if maintainer is not already set
  if (subjectOf['schema:maintainer']?.['schema:name'])
    return

  subjectOf['schema:maintainer'] = {
    '@type': 'schema:Person',
    'schema:name': userInfo.name,
    'schema:identifier': {
      '@type': 'schema:PropertyValue',
      'schema:propertyID': 'ORCID',
      'schema:value': userInfo.orcid,
      'schema:url': `https://orcid.org/${userInfo.orcid}`,
    },
  }
}

/**
 * Auto-populate fields before saving:
 * - @id: 32-char hash of DOI or title with '#' prefix
 * - schema:subjectOf.schema:about.@id: references the generated @id
 * - schema:subjectOf.schema:sdDatePublished: current ISO date
 */
export async function populateOnSave(data: any): Promise<void> {
  // Generate @id
  const recordId = await generateRecordId(data)
  if (recordId)
    data['@id'] = recordId

  // Ensure subjectOf exists
  if (!data['schema:subjectOf'])
    data['schema:subjectOf'] = {}

  const subjectOf = data['schema:subjectOf']

  // Set schema:about to reference the record's @id
  if (data['@id']) {
    subjectOf['schema:about'] = { '@id': data['@id'] }
  }

  // Set sdDatePublished to now
  subjectOf['schema:sdDatePublished'] = new Date().toISOString().split('T')[0]
}
