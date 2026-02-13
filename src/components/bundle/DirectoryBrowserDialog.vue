<template>
  <v-dialog
    :model-value="modelValue"
    max-width="700"
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-folder-search</v-icon>
        Browse Server Directory
      </v-card-title>

      <v-card-text style="min-height: 350px">
        <!-- Breadcrumb bar -->
        <div class="d-flex align-center mb-3">
          <v-btn
            icon
            size="small"
            variant="text"
            :disabled="!parentPath"
            @click="navigateTo(parentPath!)"
          >
            <v-icon>mdi-arrow-up</v-icon>
          </v-btn>

          <v-breadcrumbs :items="breadcrumbs" density="compact" class="pa-0 ml-1">
            <template #item="{ item }">
              <v-breadcrumbs-item
                :disabled="item.disabled"
                @click="!item.disabled && navigateTo(item.path)"
              >
                {{ item.title }}
              </v-breadcrumbs-item>
            </template>
            <template #divider>
              <v-icon size="small">mdi-chevron-right</v-icon>
            </template>
          </v-breadcrumbs>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="d-flex justify-center py-8">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <!-- Error -->
        <v-alert v-else-if="error" type="error" variant="outlined" class="mb-4">
          {{ error }}
        </v-alert>

        <!-- Entry list -->
        <v-list v-else density="compact" class="directory-list">
          <v-list-item
            v-if="!entries.length"
            disabled
          >
            <template #prepend>
              <v-icon>mdi-folder-alert-outline</v-icon>
            </template>
            <v-list-item-title class="text-medium-emphasis">
              Empty directory
            </v-list-item-title>
          </v-list-item>

          <v-list-item
            v-for="entry in entries"
            :key="entry.name"
            :class="{ 'directory-entry': entry.type === 'directory' }"
            @click="entry.type === 'directory' && navigateTo(entryPath(entry.name))"
          >
            <template #prepend>
              <v-icon :color="entry.type === 'directory' ? 'primary' : undefined">
                {{ entry.type === 'directory' ? 'mdi-folder' : fileIcon(entry.name) }}
              </v-icon>
            </template>
            <v-list-item-title>{{ entry.name }}</v-list-item-title>
            <template v-if="entry.type === 'file'" #append>
              <span class="text-caption text-medium-emphasis">{{ formatSize(entry.size) }}</span>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :disabled="!currentPath || currentPath === '/'"
          @click="onSelect"
        >
          Select This Directory
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { Component, Emit, Prop, Watch, toNative, Vue } from 'vue-facing-decorator'
import axios from 'axios'
import User from '~/models/user.model'

const ADA_BRIDGE_API = '/api/ada-bridge'

interface DirEntry {
  name: string
  type: 'directory' | 'file'
  path?: string
  size?: number
}

@Component({ name: 'directory-browser-dialog', emits: ['update:modelValue', 'select'] })
class DirectoryBrowserDialog extends Vue {
  @Prop({ type: Boolean, required: true }) modelValue!: boolean

  currentPath: string | null = null
  parentPath: string | null = null
  entries: DirEntry[] = []
  loading = false
  error = ''

  get breadcrumbs() {
    if (!this.currentPath || this.currentPath === '/') {
      return [{ title: 'Root', path: '/', disabled: true }]
    }

    // Use forward slashes for display; handle both / and \ separators
    const normalized = this.currentPath.replace(/\\/g, '/')
    const parts = normalized.split('/').filter(Boolean)
    const items: { title: string; path: string; disabled: boolean }[] = [
      { title: 'Root', path: '/', disabled: false },
    ]
    let accumulated = ''
    for (let i = 0; i < parts.length; i++) {
      accumulated += '/' + parts[i]
      items.push({
        title: parts[i],
        path: accumulated,
        disabled: i === parts.length - 1,
      })
    }
    return items
  }

  @Watch('modelValue')
  onDialogOpen(val: boolean) {
    if (val) {
      // Reset and load root
      this.currentPath = null
      this.parentPath = null
      this.entries = []
      this.error = ''
      this.fetchDirectory('')
    }
  }

  entryPath(name: string): string {
    if (!this.currentPath || this.currentPath === '/') {
      return '/' + name
    }
    // Handle root entries that have their own absolute path
    const entry = this.entries.find(e => e.name === name)
    if (entry?.path) {
      return entry.path
    }
    return this.currentPath + '/' + name
  }

  navigateTo(path: string) {
    this.fetchDirectory(path)
  }

  async fetchDirectory(path: string) {
    this.loading = true
    this.error = ''

    try {
      const resp = await axios.get(`${ADA_BRIDGE_API}/bundle/browse-directory/`, {
        params: {
          path: path || undefined,
          access_token: User.$state.orcidAccessToken,
        },
      })
      this.currentPath = resp.data.path
      this.parentPath = resp.data.parent
      this.entries = resp.data.entries || []
    }
    catch (e: any) {
      this.error = e.response?.data?.detail || 'Failed to list directory.'
      this.entries = []
    }
    finally {
      this.loading = false
    }
  }

  @Emit('select')
  onSelect() {
    this.$emit('update:modelValue', false)
    return this.currentPath
  }

  formatSize(bytes?: number): string {
    if (bytes == null) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  fileIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase()
    if (['yaml', 'yml'].includes(ext || '')) return 'mdi-file-code'
    if (['csv', 'tsv'].includes(ext || '')) return 'mdi-file-delimited'
    if (['zip', 'tar', 'gz'].includes(ext || '')) return 'mdi-zip-box'
    if (['png', 'jpg', 'jpeg', 'tif', 'tiff'].includes(ext || '')) return 'mdi-file-image'
    return 'mdi-file-outline'
  }
}

export default toNative(DirectoryBrowserDialog)
</script>

<style lang="scss" scoped>
.directory-entry {
  cursor: pointer;
}
.directory-list {
  max-height: 400px;
  overflow-y: auto;
}
</style>
