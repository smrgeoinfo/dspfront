<template>
  <v-card flat>
    <v-card-title class="text-h6">
      Upload Bundle
    </v-card-title>
    <v-card-text>
      <p class="text-body-1 mb-4">
        Upload a ZIP bundle containing your data files, provide a URL to a bundle,
        or select a local folder.
      </p>

      <v-tabs v-model="uploadTab" class="mb-4">
        <v-tab :value="0">
          Upload File
        </v-tab>
        <v-tab :value="1">
          From URL
        </v-tab>
        <v-tab :value="2">
          Local Directory
        </v-tab>
      </v-tabs>

      <v-tabs-window v-model="uploadTab">
        <v-tabs-window-item :value="0">
          <div
            class="drop-zone pa-8 text-center"
            :class="{ 'drop-zone--active': isDragging }"
            @dragenter.prevent="isDragging = true"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDrop"
          >
            <v-icon size="48" color="primary" class="mb-2">
              mdi-cloud-upload
            </v-icon>
            <p class="text-body-1">
              Drag and drop a ZIP file here, or click to browse
            </p>
            <v-btn
              variant="outlined"
              color="primary"
              class="mt-2"
              @click="triggerFileInput"
            >
              Browse Files
            </v-btn>
            <input
              ref="fileInput"
              type="file"
              accept=".zip"
              style="display: none"
              @change="onFileSelected"
            >
          </div>

          <div v-if="selectedFile" class="mt-4 d-flex align-center">
            <v-icon class="mr-2">
              mdi-file-outline
            </v-icon>
            <span class="text-body-2">{{ selectedFile.name }} ({{ formatSize(selectedFile.size) }})</span>
            <v-btn icon size="small" variant="text" class="ml-2" @click="clearFile">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
        </v-tabs-window-item>

        <v-tabs-window-item :value="1">
          <v-text-field
            v-model="bundleUrl"
            label="Bundle URL"
            placeholder="https://example.com/bundle.zip"
            variant="outlined"
            density="compact"
            hint="URL to a ZIP bundle file"
            persistent-hint
          />
        </v-tabs-window-item>

        <v-tabs-window-item :value="2">
          <div
            class="drop-zone pa-8 text-center"
            :class="{ 'drop-zone--active': isDragging }"
            @dragenter.prevent="isDragging = true"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDropDirectory"
          >
            <v-icon size="48" color="primary" class="mb-2">
              mdi-folder-upload
            </v-icon>
            <p class="text-body-1">
              Select a folder containing your data files
            </p>
            <v-btn
              variant="outlined"
              color="primary"
              class="mt-2"
              @click="triggerDirectoryInput"
            >
              Browse Folder
            </v-btn>
            <input
              ref="directoryInput"
              type="file"
              webkitdirectory
              directory
              style="display: none"
              @change="onDirectorySelected"
            >
          </div>

          <div v-if="selectedDirectoryFiles.length" class="mt-4">
            <div class="d-flex align-center mb-2">
              <v-icon class="mr-2">mdi-folder-outline</v-icon>
              <span class="text-body-2 font-weight-medium">{{ directoryName }}</span>
              <span class="text-body-2 ml-2 text-medium-emphasis">
                ({{ selectedDirectoryFiles.length }} files, {{ formatSize(directoryTotalSize) }})
              </span>
              <v-btn icon size="small" variant="text" class="ml-2" @click="clearDirectory">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>
          </div>
        </v-tabs-window-item>
      </v-tabs-window>

      <v-alert v-if="error" type="error" variant="outlined" class="mt-4">
        {{ error }}
      </v-alert>
    </v-card-text>

    <v-card-actions>
      <v-spacer />
      <v-btn
        color="primary"
        variant="elevated"
        :loading="isUploading"
        :disabled="!canUpload"
        @click="onUpload"
      >
        Upload & Introspect
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { Component, Emit, toNative, Vue } from 'vue-facing-decorator'
import axios from 'axios'
import JSZip from 'jszip'
import User from '~/models/user.model'

const ADA_BRIDGE_API = '/api/ada-bridge'

@Component({ name: 'bundle-upload-step' })
class BundleUploadStep extends Vue {
  uploadTab = 0
  isDragging = false
  selectedFile: File | null = null
  bundleUrl = ''
  selectedDirectoryFiles: File[] = []
  directoryName = ''
  isUploading = false
  error = ''

  get directoryTotalSize(): number {
    return this.selectedDirectoryFiles.reduce((sum, f) => sum + f.size, 0)
  }

  get canUpload(): boolean {
    if (this.uploadTab === 0) return !!this.selectedFile
    if (this.uploadTab === 1) return !!this.bundleUrl.trim()
    return this.selectedDirectoryFiles.length > 0
  }

  triggerFileInput() {
    (this.$refs.fileInput as HTMLInputElement).click()
  }

  triggerDirectoryInput() {
    (this.$refs.directoryInput as HTMLInputElement).click()
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) {
      this.selectedFile = file
      this.error = ''
    }
  }

  onDirectorySelected(event: Event) {
    const input = event.target as HTMLInputElement
    const files = input.files
    if (!files || files.length === 0) return

    this.selectedDirectoryFiles = Array.from(files)
    // Extract the top-level directory name from webkitRelativePath (e.g. "mydir/sub/file.txt")
    const firstPath = (files[0] as any).webkitRelativePath || files[0].name
    this.directoryName = firstPath.split('/')[0] || 'selected folder'
    this.error = ''
  }

  onDrop(event: DragEvent) {
    this.isDragging = false
    const file = event.dataTransfer?.files[0]
    if (file && file.name.endsWith('.zip')) {
      this.selectedFile = file
      this.error = ''
    }
    else {
      this.error = 'Please drop a ZIP file.'
    }
  }

  async onDropDirectory(event: DragEvent) {
    this.isDragging = false
    const items = event.dataTransfer?.items
    if (!items || items.length === 0) return

    // Try to read directory entries via DataTransferItem.webkitGetAsEntry
    const firstItem = items[0]
    const entry = firstItem.webkitGetAsEntry?.()
    if (entry?.isDirectory) {
      const files = await this._readDirectoryEntry(entry as FileSystemDirectoryEntry)
      if (files.length > 0) {
        this.selectedDirectoryFiles = files
        this.directoryName = entry.name
        this.error = ''
        return
      }
    }
    this.error = 'Please drop a folder, or use the Browse Folder button.'
  }

  /** Recursively read all files from a dropped directory entry. */
  async _readDirectoryEntry(dirEntry: FileSystemDirectoryEntry, basePath = ''): Promise<File[]> {
    const reader = dirEntry.createReader()
    const files: File[] = []

    const readBatch = (): Promise<FileSystemEntry[]> =>
      new Promise((resolve, reject) => reader.readEntries(resolve, reject))

    let entries: FileSystemEntry[] = []
    // readEntries may return results in batches
    let batch = await readBatch()
    while (batch.length > 0) {
      entries = entries.concat(batch)
      batch = await readBatch()
    }

    for (const e of entries) {
      if (e.name.startsWith('.')) continue
      if (e.isFile) {
        const file = await new Promise<File>((resolve, reject) =>
          (e as FileSystemFileEntry).file(resolve, reject),
        )
        // Attach relative path for zipping
        const relativePath = basePath ? `${basePath}/${e.name}` : e.name
        Object.defineProperty(file, '_relativePath', { value: relativePath })
        files.push(file)
      }
      else if (e.isDirectory) {
        const subPath = basePath ? `${basePath}/${e.name}` : e.name
        const subFiles = await this._readDirectoryEntry(e as FileSystemDirectoryEntry, subPath)
        files.push(...subFiles)
      }
    }
    return files
  }

  clearFile() {
    this.selectedFile = null
  }

  clearDirectory() {
    this.selectedDirectoryFiles = []
    this.directoryName = ''
    // Reset the input so re-selecting the same folder triggers change
    const input = this.$refs.directoryInput as HTMLInputElement
    if (input) input.value = ''
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  @Emit('uploaded')
  emitUploaded(sessionData: any) {
    let originalFilename = ''
    if (this.uploadTab === 0) {
      originalFilename = this.selectedFile?.name || ''
    } else if (this.uploadTab === 1) {
      originalFilename = this.bundleUrl.trim().replace(/^.*[\\/]/, '').replace(/[?#].*$/, '')
    } else {
      originalFilename = this.directoryName || 'directory'
    }
    return { ...sessionData, _originalFilename: originalFilename }
  }

  /** Zip the selected directory files client-side and return a File object. */
  async _zipDirectoryFiles(): Promise<File> {
    const zip = new JSZip()
    for (const file of this.selectedDirectoryFiles) {
      // Use webkitRelativePath (from input) or _relativePath (from drag-drop)
      const relativePath = (file as any).webkitRelativePath || (file as any)._relativePath || file.name
      // Strip the top-level directory name so ZIP contents match the folder's contents
      const parts = relativePath.split('/')
      const innerPath = parts.length > 1 ? parts.slice(1).join('/') : parts[0]
      zip.file(innerPath, file)
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    return new File([blob], `${this.directoryName}.zip`, { type: 'application/zip' })
  }

  async onUpload() {
    this.isUploading = true
    this.error = ''

    try {
      const formData = new FormData()

      if (this.uploadTab === 2) {
        // Local directory — zip client-side, then upload as file
        const zipFile = await this._zipDirectoryFiles()
        formData.append('file', zipFile)
      }
      else if (this.uploadTab === 0 && this.selectedFile) {
        formData.append('file', this.selectedFile)
      }
      else {
        formData.append('url', this.bundleUrl.trim())
      }

      const uploadResp = await axios.post(`${ADA_BRIDGE_API}/bundle/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { access_token: User.$state.orcidAccessToken },
      })

      const sessionId = uploadResp.data.session_id

      // Step 2: Introspect
      await axios.post(`${ADA_BRIDGE_API}/bundle/${sessionId}/introspect/`, {}, {
        params: { access_token: User.$state.orcidAccessToken },
      })

      // Step 3: Fetch session state
      const sessionResp = await axios.get(`${ADA_BRIDGE_API}/bundle/${sessionId}/`, {
        params: { access_token: User.$state.orcidAccessToken },
      })

      this.emitUploaded(sessionResp.data)
    }
    catch (e: any) {
      console.error('Bundle upload failed:', e)
      this.error = e.response?.data?.detail || 'Failed to upload bundle. Please try again.'
    }
    finally {
      this.isUploading = false
    }
  }
}

export default toNative(BundleUploadStep)
</script>

<style lang="scss" scoped>
.drop-zone {
  border: 2px dashed rgba(0, 0, 0, 0.24);
  border-radius: 8px;
  transition: border-color 0.2s;
  cursor: pointer;

  &--active {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.04);
  }
}
</style>
