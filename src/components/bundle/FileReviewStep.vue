<template>
  <v-card flat>
    <v-card-title class="text-h6">
      File Review
    </v-card-title>
    <v-card-subtitle>
      Review the files detected in your bundle. You can assign component types and exclude files.
    </v-card-subtitle>
    <v-card-text>
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
            <td class="text-body-2">
              {{ file.path }}
            </td>
            <td class="text-body-2">
              {{ file.mimeType || '—' }}
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
  'text/plain': ['DataTable', 'TextDocument'],
}

const DEFAULT_COMPONENT_TYPES = ['DataFile', 'SupportingFile', 'Document', 'Other']

@Component({ name: 'file-review-step' })
class FileReviewStep extends Vue {
  @Prop({ required: true }) introspectionResult!: any

  files: BundleFile[] = []

  get includedFiles(): BundleFile[] {
    return this.files.filter(f => f.included)
  }

  @Watch('introspectionResult', { immediate: true })
  onIntrospectionChanged() {
    if (!this.introspectionResult) return

    const manifest = this.introspectionResult.manifest || []
    const fileDetails = this.introspectionResult.files || {}

    this.files = manifest.map((path: string) => {
      const info = fileDetails[path] || {}
      const ext = path.split('.').pop()?.toLowerCase() || ''
      const mimeType = info.mime_type || guessMimeType(ext)

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
        mimeType,
        size: info.size ? formatSize(info.size) : '',
        summary,
        componentType: '',
        included: true,
        inspection: info,
      }
    })
  }

  getComponentTypes(mimeType: string): string[] {
    return [...(COMPONENT_TYPE_MAP[mimeType] || []), ...DEFAULT_COMPONENT_TYPES]
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
    xml: 'application/xml',
  }
  return map[ext] || ''
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default toNative(FileReviewStep)
</script>
