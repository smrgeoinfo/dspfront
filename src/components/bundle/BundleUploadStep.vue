<template>
  <v-card flat>
    <v-card-title class="text-h6">
      Upload Bundle
    </v-card-title>
    <v-card-text>
      <p class="text-body-1 mb-4">
        Upload a ZIP bundle containing your data files, provide a URL to a bundle,
        or enter a server directory path.
      </p>

      <v-tabs v-model="uploadTab" class="mb-4">
        <v-tab :value="0">
          Upload File
        </v-tab>
        <v-tab :value="1">
          From URL
        </v-tab>
        <v-tab :value="2">
          Server Directory
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
          <v-text-field
            v-model="directoryPath"
            label="Server Directory Path"
            placeholder="/data/bundles/my-dataset"
            variant="outlined"
            density="compact"
            hint="Absolute path to a directory on the server containing bundle files"
            persistent-hint
          />
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
import User from '~/models/user.model'

const ADA_BRIDGE_API = '/api/ada-bridge'

@Component({ name: 'bundle-upload-step' })
class BundleUploadStep extends Vue {
  uploadTab = 0
  isDragging = false
  selectedFile: File | null = null
  bundleUrl = ''
  directoryPath = ''
  isUploading = false
  error = ''

  get canUpload(): boolean {
    if (this.uploadTab === 0) return !!this.selectedFile
    if (this.uploadTab === 1) return !!this.bundleUrl.trim()
    return !!this.directoryPath.trim()
  }

  triggerFileInput() {
    (this.$refs.fileInput as HTMLInputElement).click()
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) {
      this.selectedFile = file
      this.error = ''
    }
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

  clearFile() {
    this.selectedFile = null
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  @Emit('uploaded')
  emitUploaded(sessionData: any) {
    // Attach the original filename so downstream steps can use it
    // (bundle_path on the server is a temp file name)
    let originalFilename = ''
    if (this.uploadTab === 0) {
      originalFilename = this.selectedFile?.name || ''
    } else if (this.uploadTab === 1) {
      originalFilename = this.bundleUrl.trim().replace(/^.*[\\/]/, '').replace(/[?#].*$/, '')
    } else {
      // Use the directory basename for directory uploads
      originalFilename = this.directoryPath.trim().replace(/[\\/]+$/, '').replace(/^.*[\\/]/, '')
    }
    return { ...sessionData, _originalFilename: originalFilename }
  }

  async onUpload() {
    this.isUploading = true
    this.error = ''

    try {
      let uploadResp

      if (this.uploadTab === 2) {
        // Server directory — send JSON body
        uploadResp = await axios.post(
          `${ADA_BRIDGE_API}/bundle/upload/`,
          { directory_path: this.directoryPath.trim() },
          {
            headers: { 'Content-Type': 'application/json' },
            params: { access_token: User.$state.orcidAccessToken },
          },
        )
      }
      else {
        // File upload or URL — send multipart form data
        const formData = new FormData()
        if (this.uploadTab === 0 && this.selectedFile) {
          formData.append('file', this.selectedFile)
        }
        else {
          formData.append('url', this.bundleUrl.trim())
        }

        uploadResp = await axios.post(`${ADA_BRIDGE_API}/bundle/upload/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          params: { access_token: User.$state.orcidAccessToken },
        })
      }

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
