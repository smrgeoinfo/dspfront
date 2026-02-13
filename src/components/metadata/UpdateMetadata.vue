<template>
  <v-container class="update-metadata py-8">
    <h1 class="text-h4 mb-2">
      Update Existing Metadata
    </h1>
    <p class="text-body-1 text-medium-emphasis mb-4">
      Fetch and edit an existing metadata record by DOI, upload a JSON-LD file, or load from a URL.
    </p>
    <v-divider class="mb-6" />

    <v-tabs v-model="activeTab" class="mb-6">
      <v-tab :value="0">
        By DOI
      </v-tab>
      <v-tab :value="1">
        From Local File
      </v-tab>
      <v-tab :value="2">
        From URL
      </v-tab>
    </v-tabs>

    <v-tabs-window v-model="activeTab">
      <!-- By DOI -->
      <v-tabs-window-item :value="0">
        <v-card flat class="pa-4">
          <v-text-field
            v-model="doi"
            label="DOI"
            placeholder="10.xxxxx/example"
            variant="outlined"
            density="compact"
            hint="Enter the DOI of the record to fetch from ADA"
            persistent-hint
            class="mb-4"
          />
          <v-btn
            color="primary"
            variant="elevated"
            :loading="isFetching"
            :disabled="!doi.trim()"
            @click="fetchByDoi"
          >
            Fetch Record
          </v-btn>
        </v-card>
      </v-tabs-window-item>

      <!-- From Local File -->
      <v-tabs-window-item :value="1">
        <v-card flat class="pa-4">
          <p class="text-body-2 mb-4">
            Upload an existing JSON-LD metadata file to edit.
          </p>
          <v-btn variant="outlined" @click="triggerFileInput">
            Choose File
          </v-btn>
          <input
            ref="fileInput"
            type="file"
            accept=".json,.jsonld"
            style="display: none"
            @change="onFileSelected"
          >
          <span v-if="selectedFileName" class="ml-2 text-body-2">{{ selectedFileName }}</span>
        </v-card>
      </v-tabs-window-item>

      <!-- From URL -->
      <v-tabs-window-item :value="2">
        <v-card flat class="pa-4">
          <v-text-field
            v-model="metadataUrl"
            label="Metadata URL"
            placeholder="https://example.com/metadata.json"
            variant="outlined"
            density="compact"
            hint="URL to a JSON-LD metadata document"
            persistent-hint
            class="mb-4"
          />
          <v-btn
            color="primary"
            variant="elevated"
            :loading="isFetching"
            :disabled="!metadataUrl.trim()"
            @click="fetchFromUrl"
          >
            Fetch Metadata
          </v-btn>
        </v-card>
      </v-tabs-window-item>
    </v-tabs-window>

    <v-alert v-if="error" type="error" variant="outlined" class="mt-4">
      {{ error }}
    </v-alert>

    <!-- Profile selection once metadata is loaded -->
    <template v-if="loadedJsonld">
      <v-divider class="my-6" />
      <div class="text-h6 mb-4">
        Metadata Loaded — Select Profile to Edit
      </div>

      <v-alert v-if="detectedInfo" type="info" variant="tonal" density="compact" class="mb-4" style="max-width: 30rem">
        Profile auto-detected from {{ detectedInfo }}
      </v-alert>

      <v-select
        v-model="selectedProfile"
        :items="profileItems"
        item-title="label"
        item-value="name"
        label="Metadata Profile"
        variant="outlined"
        density="compact"
        :loading="isLoadingProfiles"
        class="mb-4"
        style="max-width: 30rem"
      />

      <v-btn
        color="primary"
        variant="elevated"
        :disabled="!selectedProfile"
        @click="openInForm"
      >
        Open in Form
      </v-btn>
    </template>
  </v-container>
</template>

<script lang="ts">
import { Component, toNative, Vue } from 'vue-facing-decorator'
import { useRouter } from 'vue-router'
import { Notifications } from '@cznethub/cznet-vue-core'
import axios from 'axios'
import User from '~/models/user.model'

const ADA_BRIDGE_API = '/api/ada-bridge'
const CATALOG_API = '/api/catalog'

@Component({ name: 'update-metadata' })
class UpdateMetadata extends Vue {
  router = useRouter()

  activeTab = 0
  doi = ''
  metadataUrl = ''
  selectedFileName = ''
  isFetching = false
  error = ''

  loadedJsonld: any = null
  profiles: { name: string }[] = []
  selectedProfile = ''
  isLoadingProfiles = false
  detectedInfo = ''

  get profileItems() {
    return this.profiles.map(p => ({
      name: p.name,
      label: this.getProfileLabel(p.name),
    }))
  }

  getProfileLabel(name: string): string {
    const key = `metadata.ada.profiles.${name}.name`
    const translated = this.$t(key) as string
    return translated !== key ? translated : name
  }

  async created() {
    this.isLoadingProfiles = true
    try {
      const resp = await axios.get(`${CATALOG_API}/profiles/`)
      this.profiles = resp.data.results || []
    }
    catch (e) {
      console.error('Failed to load profiles:', e)
    }
    finally {
      this.isLoadingProfiles = false
    }
  }

  async fetchByDoi() {
    this.isFetching = true
    this.error = ''
    this.loadedJsonld = null

    try {
      const resp = await axios.get(`${ADA_BRIDGE_API}/lookup/`, {
        params: { doi: this.doi.trim(), access_token: User.$state.orcidAccessToken },
      })
      this.loadedJsonld = resp.data.jsonld
      await this.detectProfile()
    }
    catch (e: any) {
      console.error('DOI lookup failed:', e)
      this.error = e.response?.data?.detail || 'Failed to fetch record by DOI.'
    }
    finally {
      this.isFetching = false
    }
  }

  triggerFileInput() {
    (this.$refs.fileInput as HTMLInputElement).click()
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    this.selectedFileName = file.name
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        this.loadedJsonld = JSON.parse(e.target?.result as string)
        this.error = ''
        await this.detectProfile()
      }
      catch (err) {
        this.error = 'Failed to parse JSON file.'
        this.loadedJsonld = null
      }
    }
    reader.readAsText(file)
    input.value = ''
  }

  async fetchFromUrl() {
    this.isFetching = true
    this.error = ''
    this.loadedJsonld = null

    try {
      const resp = await axios.get(this.metadataUrl.trim())
      if (typeof resp.data === 'object') {
        this.loadedJsonld = resp.data
        await this.detectProfile()
      }
      else {
        this.error = 'URL did not return valid JSON.'
      }
    }
    catch (e: any) {
      console.error('URL fetch failed:', e)
      this.error = 'Failed to fetch metadata from URL.'
    }
    finally {
      this.isFetching = false
    }
  }

  async detectProfile() {
    this.detectedInfo = ''
    if (!this.loadedJsonld) return
    try {
      const resp = await axios.post(`${CATALOG_API}/detect-profile/`, {
        jsonld: this.loadedJsonld,
      })
      if (resp.data.profile) {
        this.selectedProfile = resp.data.profile
        const sourceMap: Record<string, string> = {
          conformsTo: 'conformsTo URI',
          additionalType: 'schema:additionalType',
          termCode: 'measurement technique code',
        }
        this.detectedInfo = sourceMap[resp.data.source] || resp.data.source
      }
    }
    catch (e) {
      console.warn('Profile detection failed:', e)
    }
  }

  async openInForm() {
    if (!this.loadedJsonld || !this.selectedProfile) return

    try {
      // Save as draft catalog record first
      const profileResp = await axios.get(`${CATALOG_API}/profiles/${this.selectedProfile}/`)
      const profileId = profileResp.data.id

      const resp = await axios.post(`${CATALOG_API}/records/`, {
        profile: profileId,
        jsonld: this.loadedJsonld,
        status: 'draft',
      }, {
        headers: { 'Content-Type': 'application/json' },
        params: { access_token: User.$state.orcidAccessToken },
      })

      // Navigate to the profile form with the record loaded
      this.router.push({
        name: 'metadata-ada-profile',
        params: { profile: this.selectedProfile },
        query: { record: resp.data.id },
      })
    }
    catch (e: any) {
      console.error('Failed to create draft record:', e)
      const data = e.response?.data
      if (data?.detail) {
        this.error = data.detail
      }
      else if (data?.jsonld) {
        const msgs = Array.isArray(data.jsonld) ? data.jsonld : [data.jsonld]
        this.error = 'Validation errors: ' + msgs.join('; ')
      }
      else {
        this.error = 'Failed to create draft record.'
      }
    }
  }
}

export default toNative(UpdateMetadata)
</script>

<style lang="scss" scoped>
.update-metadata {
  max-width: 800px;
}
</style>
