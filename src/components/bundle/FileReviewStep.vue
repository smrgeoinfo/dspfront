<template>
  <v-card flat>
    <v-card-title class="text-h6">
      File Review
    </v-card-title>
    <v-card-subtitle>
      Review the files detected in your bundle. You can assign component types and exclude files.
    </v-card-subtitle>
    <v-card-text>
      <div v-if="commonPrefix" class="text-body-2 text-medium-emphasis mb-2">
        Session: <code>{{ commonPrefix }}</code>
      </div>
      <v-table density="compact">
        <thead>
          <tr>
            <th>Include</th>
            <th>Filename</th>
            <th>MIME Type</th>
            <th>Size</th>
            <th>Inspection Summary</th>
            <th>Component Type</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="file in files" :key="file.path">
            <td>
              <v-checkbox
                v-model="file.included"
                density="compact"
                hide-details
              />
            </td>
            <td class="text-body-2" :title="file.path">
              {{ file.displayName }}
            </td>
            <td>
              <v-combobox
                v-model="file.mimeType"
                :items="mimeTypeOptions"
                density="compact"
                variant="outlined"
                hide-details
                style="min-width: 14rem"
              />
            </td>
            <td class="text-body-2">
              {{ file.size || '—' }}
            </td>
            <td class="text-body-2">
              {{ file.summary || '—' }}
            </td>
            <td>
              <v-select
                v-model="file.componentType"
                :items="getComponentTypes(file.mimeType)"
                density="compact"
                variant="outlined"
                hide-details
                style="min-width: 12rem"
              />
            </td>
          </tr>
        </tbody>
      </v-table>

      <v-alert
        v-if="files.length === 0"
        type="info"
        variant="outlined"
        class="mt-4"
      >
        No files were found in the bundle.
      </v-alert>
    </v-card-text>

    <v-card-actions>
      <v-btn variant="text" @click="$emit('back')">
        Back
      </v-btn>
      <v-spacer />
      <v-btn
        color="primary"
        variant="elevated"
        :disabled="includedFiles.length === 0"
        @click="onContinue"
      >
        Continue
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { Component, Emit, Prop, toNative, Vue, Watch } from 'vue-facing-decorator'

export interface BundleFile {
  path: string
  displayName: string
  mimeType: string
  size: string
  summary: string
  componentType: string
  included: boolean
  inspection: any
}

const COMPONENT_TYPE_MAP: Record<string, string[]> = {
  'text/csv': ['DataTable', 'TimeSeries', 'PointData'],
  'application/vnd.ms-excel': ['DataTable'],
  'image/jpeg': ['Image', 'Photograph', 'Micrograph'],
  'image/png': ['Image', 'Photograph', 'Micrograph'],
  'image/tiff': ['Image', 'Photograph', 'Micrograph', 'GeoTIFF'],
  'application/x-hdf5': ['ScientificDataset', 'SpectralData'],
  'application/x-netcdf': ['ScientificDataset', 'GridData'],
  'application/pdf': ['Document', 'Report'],
  'application/json': ['Metadata', 'DataFile'],
  'application/ld+json': ['Metadata'],
  'application/yaml': ['Product description', 'Metadata', 'Configuration'],
  'application/xml': ['Metadata', 'DataFile'],
  'text/plain': ['DataTable', 'TextDocument'],
}

const DEFAULT_COMPONENT_TYPES = ['DataFile', 'Metadata', 'SupportingFile', 'Document', 'Other']

const MIME_TYPE_OPTIONS = [
  'text/csv',
  'text/plain',
  'text/tab-separated-values',
  'application/json',
  'application/ld+json',
  'application/xml',
  'application/pdf',
  'application/zip',
  'application/yaml',
  'application/x-hdf5',
  'application/x-netcdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/svg+xml',
]

@Component({ name: 'file-review-step' })
class FileReviewStep extends Vue {
  @Prop({ required: true }) introspectionResult!: any
  @Prop({ default: '' }) dataComponentType!: string

  files: BundleFile[] = []
  mimeTypeOptions = MIME_TYPE_OPTIONS
  commonPrefix = ''

  get includedFiles(): BundleFile[] {
    return this.files.filter(f => f.included)
  }

  @Watch('introspectionResult', { immediate: true })
  onIntrospectionChanged() {
    if (!this.introspectionResult) return

    const manifest: string[] = this.introspectionResult.manifest || []
    const fileDetails = this.introspectionResult.files || {}

    // Strip folder paths to get bare filenames
    const filenames = manifest.map((p: string) => p.replace(/^.*[\\/]/, ''))

    // Find the longest prefix shared by the majority (>50%) of filenames.
    // This captures session prefixes like "20241216_SV-RUEC_UCa_OREX-800123-0_1_"
    // while excluding outliers like "product_....yaml".
    this.commonPrefix = findMajorityPrefix(filenames)

    // Build a set of non-YAML base names to detect YAML companions.
    // A .yaml whose stem matches another file's stem is a metadata descriptor.
    const baseNameSet = new Set<string>()
    for (const fn of filenames) {
      const dotIdx = fn.lastIndexOf('.')
      const stem = dotIdx > 0 ? fn.slice(0, dotIdx) : fn
      const ext = dotIdx > 0 ? fn.slice(dotIdx + 1).toLowerCase() : ''
      if (ext !== 'yaml' && ext !== 'yml') {
        baseNameSet.add(stem)
      }
    }

    this.files = manifest.map((path: string, i: number) => {
      const info = fileDetails[path] || {}
      const filename = filenames[i]
      // Strip common prefix for display; keep full name if it doesn't match
      const displayName = this.commonPrefix && filename.startsWith(this.commonPrefix)
        ? filename.slice(this.commonPrefix.length)
        : filename
      const ext = filename.split('.').pop()?.toLowerCase() || ''
      const mimeType = info.mime_type || guessMimeType(ext)
      const dotIdx = filename.lastIndexOf('.')
      const stem = dotIdx > 0 ? filename.slice(0, dotIdx) : filename

      // Default component types:
      // - YAML files with a matching non-YAML sibling → 'Metadata'
      // - Non-YAML data files → dataComponentType from product.yaml (if available)
      // - Product YAML (starts with 'product') → 'Product description'
      const isYaml = ext === 'yaml' || ext === 'yml'
      const isCompanionYaml = isYaml && baseNameSet.has(stem)
      const isProductYaml = isYaml && displayName.toLowerCase().startsWith('product')
      let componentType = ''
      if (isProductYaml) {
        componentType = 'Product description'
      }
      else if (isCompanionYaml) {
        componentType = 'Metadata'
      }
      else if (!isYaml && this.dataComponentType) {
        componentType = this.dataComponentType
      }

      let summary = ''
      if (info.columns && info.row_count) {
        summary = `CSV: ${info.columns.length} columns, ${info.row_count} rows`
      }
      else if (info.width && info.height) {
        summary = `Image: ${info.width}×${info.height}`
      }
      else if (info.variables) {
        summary = `${info.variables.length} variables`
      }

      return {
        path,
        displayName,
        mimeType,
        size: info.size ? formatSize(info.size) : '',
        summary,
        componentType,
        included: true,
        inspection: info,
      }
    })
  }

  getComponentTypes(mimeType: string): string[] {
    const specific = COMPONENT_TYPE_MAP[mimeType] || []
    const combined = [...specific]
    // Add dataComponentType from product.yaml if available
    if (this.dataComponentType && !combined.includes(this.dataComponentType)) {
      combined.unshift(this.dataComponentType)
    }
    for (const t of DEFAULT_COMPONENT_TYPES) {
      if (!combined.includes(t)) combined.push(t)
    }
    return combined
  }

  @Emit('continue')
  onContinue() {
    return this.includedFiles
  }
}

function guessMimeType(ext: string): string {
  const map: Record<string, string> = {
    csv: 'text/csv',
    tsv: 'text/csv',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    h5: 'application/x-hdf5',
    hdf5: 'application/x-hdf5',
    nc: 'application/x-netcdf',
    pdf: 'application/pdf',
    txt: 'text/plain',
    json: 'application/json',
    jsonld: 'application/ld+json',
    xml: 'application/xml',
    yaml: 'application/yaml',
    yml: 'application/yaml',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    zip: 'application/zip',
    svg: 'image/svg+xml',
  }
  return map[ext] || ''
}

function findMajorityPrefix(names: string[]): string {
  if (names.length < 3) return ''
  // Use the first name as a candidate and find the longest prefix shared
  // by more than half of the filenames. Trim to the last '_' or '-' boundary.
  const threshold = Math.ceil(names.length / 2)
  const ref = names[0]
  let best = ''
  for (let len = 1; len <= ref.length; len++) {
    const candidate = ref.slice(0, len)
    const count = names.filter(n => n.startsWith(candidate)).length
    if (count >= threshold) {
      best = candidate
    }
    else {
      break
    }
  }
  // Trim to the last separator boundary ('_' or '-') so we don't cut mid-word
  const lastSep = Math.max(best.lastIndexOf('_'), best.lastIndexOf('-'))
  if (lastSep > 0) {
    best = best.slice(0, lastSep + 1)
  }
  else {
    return ''
  }
  // Only use if it's meaningfully long (at least 8 chars)
  return best.length >= 8 ? best : ''
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default toNative(FileReviewStep)
</script>
