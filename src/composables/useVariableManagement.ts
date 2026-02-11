/**
 * Shared composable for variable management in metadata forms.
 *
 * Extracts the variable add/remove/edit logic from ada-profile-form.vue
 * so it can be used by both ada-profile-form and MetadataFormStep.
 */

import { generateVariableId } from '~/services/catalog'

export interface VariableInfo {
  name: string
  description: string
  unitText?: string
}

export interface BundleFileInspection {
  columns?: Array<string | { name: string; dtype?: string }>
  variables?: Array<string | { name: string; long_name?: string }>
}

/**
 * Create a new variableMeasured item as JSON-LD.
 */
export async function createVariableEntry(info: VariableInfo): Promise<any> {
  const id = await generateVariableId(info.name)
  const variable: any = {
    '@type': ['schema:PropertyValue', 'cdi:InstanceVariable'],
    '@id': id,
    'schema:name': info.name,
    'schema:description': info.description,
  }
  if (info.unitText?.trim()) {
    variable['schema:unitText'] = info.unitText.trim()
  }
  return variable
}

/**
 * Pre-populate variableMeasured from file introspection results.
 *
 * Extracts CSV column names, HDF5/NetCDF variable names, etc.
 * and creates variableMeasured entries for each unique variable
 * not already present.
 */
export function prePopulateVariablesFromInspection(
  data: any,
  files: BundleFileInspection[],
): void {
  if (!files?.length) return

  const variables: any[] = data['schema:variableMeasured'] || []

  for (const file of files) {
    // CSV columns
    if (file.columns) {
      for (const col of file.columns) {
        const colName = typeof col === 'string' ? col : col.name
        if (!colName) continue
        const exists = variables.some((v: any) => v['schema:name'] === colName)
        if (!exists) {
          const dtype = typeof col === 'object' ? col.dtype : undefined
          variables.push({
            '@type': ['schema:PropertyValue', 'cdi:InstanceVariable'],
            'schema:name': colName,
            'schema:description': dtype ? `${colName} (${dtype})` : colName,
          })
        }
      }
    }

    // HDF5/NetCDF variables
    if (file.variables) {
      for (const varInfo of file.variables) {
        const varName = typeof varInfo === 'string' ? varInfo : varInfo.name
        if (!varName) continue
        const exists = variables.some((v: any) => v['schema:name'] === varName)
        if (!exists) {
          const longName = typeof varInfo === 'object' ? varInfo.long_name : undefined
          variables.push({
            '@type': ['schema:PropertyValue', 'cdi:InstanceVariable'],
            'schema:name': varName,
            'schema:description': longName || varName,
          })
        }
      }
    }
  }

  if (variables.length) {
    data['schema:variableMeasured'] = variables
  }
}

/**
 * Recursively walk a JSON Schema tree and set enum on any
 * cdi:formats_InstanceVariable string property.
 *
 * This allows physicalMapping dropdowns to reflect the currently
 * defined variable names.
 */
export function setFormatsVariableEnum(node: any, enumValues: string[]): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) setFormatsVariableEnum(item, enumValues)
    return
  }

  const props = node.properties
  if (props && props['cdi:formats_InstanceVariable']) {
    const fiv = props['cdi:formats_InstanceVariable']
    if (fiv.type === 'string') fiv.enum = enumValues
  }

  if (props) {
    for (const key of Object.keys(props))
      setFormatsVariableEnum(props[key], enumValues)
  }
  if (node.items) setFormatsVariableEnum(node.items, enumValues)
}

/**
 * Build the variable enum values from the current data's variableMeasured.
 * Also generates @id for any variables missing one.
 */
export async function buildVariableEnum(data: any): Promise<string[]> {
  const variables: string[] = []
  for (const v of data['schema:variableMeasured'] || []) {
    if (v && typeof v === 'object' && v['schema:name']) {
      const name = v['schema:name']
      if (!v['@id']) {
        v['@id'] = await generateVariableId(name)
      }
      variables.push(name)
    }
  }
  return variables
}
