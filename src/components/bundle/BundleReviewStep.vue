<template>
  <v-card flat>
    <v-card-title class="text-h6">
      Review & Submit
    </v-card-title>
    <v-card-text>
      <v-alert type="info" variant="outlined" class="mb-4">
        Review the metadata below before saving. You can go back to make changes.
      </v-alert>

      <div class="text-subtitle-1 font-weight-bold mb-2">
        Title
      </div>
      <p class="text-body-1 mb-4">
        {{ metadata['schema:name'] || '(not set)' }}
      </p>

      <div class="text-subtitle-1 font-weight-bold mb-2">
        Description
      </div>
      <p class="text-body-2 mb-4">
        {{ metadata['schema:description'] || '(not set)' }}
      </p>

      <div class="text-subtitle-1 font-weight-bold mb-2">
        Profile
      </div>
      <p class="text-body-2 mb-4">
        {{ profileKey || '(not set)' }}
      </p>

      <div v-if="creators.length" class="mb-4">
        <div class="text-subtitle-1 font-weight-bold mb-2">
          Creators
        </div>
        <v-chip
          v-for="(creator, i) in creators"
          :key="i"
          class="mr-1 mb-1"
          size="small"
        >
          {{ creator }}
        </v-chip>
      </div>

      <div v-if="files.length" class="mb-4">
        <div class="text-subtitle-1 font-weight-bold mb-2">
          Included Files ({{ files.length }})
        </div>
        <v-list density="compact" class="pa-0">
          <v-list-item
            v-for="file in files"
            :key="file.path"
            :title="file.path"
            :subtitle="file.componentType ? `Type: ${file.componentType}` : ''"
          >
            <template #prepend>
              <v-icon size="small">
                mdi-file-outline
              </v-icon>
            </template>
          </v-list-item>
        </v-list>
      </div>

      <div v-if="variables.length" class="mb-4">
        <div class="text-subtitle-1 font-weight-bold mb-2">
          Variables ({{ variables.length }})
        </div>
        <v-chip
          v-for="(v, i) in variables"
          :key="i"
          class="mr-1 mb-1"
          size="small"
          variant="outlined"
        >
          {{ v }}
        </v-chip>
      </div>

      <v-alert v-if="submitError" type="error" variant="outlined" class="mt-4">
        {{ submitError }}
      </v-alert>

      <v-alert v-if="submitSuccess" type="success" variant="outlined" class="mt-4">
        {{ submitSuccess }}
      </v-alert>
    </v-card-text>

    <v-card-actions>
      <v-btn variant="text" @click="$emit('back')">
        Back
      </v-btn>
      <v-spacer />
      <v-btn
        variant="outlined"
        color="primary"
        :loading="isSavingCatalog"
        :disabled="isSavingAda"
        @click="saveToCatalog"
      >
        Save to Catalog
      </v-btn>
      <v-btn
        color="primary"
        variant="elevated"
        :loading="isSavingAda"
        :disabled="isSavingCatalog"
        @click="saveAndPushToAda"
      >
        Save & Push to ADA
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { Component, Emit, Prop, toNative, Vue } from 'vue-facing-decorator'
import { Notifications } from '@cznethub/cznet-vue-core'
import axios from 'axios'
import User from '~/models/user.model'
import { populateOnSave } from '~/services/catalog'

const ADA_BRIDGE_API = '/api/ada-bridge'
const CATALOG_API = '/api/catalog'

@Component({ name: 'bundle-review-step' })
class BundleReviewStep extends Vue {
  @Prop({ required: true }) metadata!: any
  @Prop({ required: true }) profileId!: number
  @Prop({ required: true }) profileKey!: string
  @Prop({ default: '' }) sessionId!: string
  @Prop({ default: () => [] }) files!: any[]

  isSavingCatalog = false
  isSavingAda = false
  submitError = ''
  submitSuccess = ''

  get creators(): string[] {
    const raw = this.metadata['schema:creator']
    if (!raw) return []
    const items = Array.isArray(raw) ? raw : [raw]
    return items
      .flatMap((item: any) => {
        const list = item?.['@list'] || [item]
        return list.map((p: any) => p?.['schema:name'] || '').filter(Boolean)
      })
  }

  get variables(): string[] {
    return (this.metadata['schema:variableMeasured'] || [])
      .map((v: any) => v?.['schema:name'])
      .filter(Boolean)
  }

  @Emit('saved')
  emitSaved(result: any) {
    return result
  }

  async saveToCatalog() {
    this.isSavingCatalog = true
    this.submitError = ''
    this.submitSuccess = ''

    try {
      const data = JSON.parse(JSON.stringify(this.metadata))
      await populateOnSave(data)

      const response = await axios.post(`${CATALOG_API}/records/`, {
        profile: this.profileId,
        jsonld: data,
        status: 'draft',
      }, {
        headers: { 'Content-Type': 'application/json' },
        params: { access_token: User.$state.orcidAccessToken },
      })

      this.submitSuccess = 'Metadata saved to catalog successfully.'
      Notifications.toast({ message: 'Metadata saved to catalog!', type: 'success' })
      this.emitSaved({ catalogRecordId: response.data.id, pushedToAda: false })
    }
    catch (e: any) {
      console.error('Failed to save to catalog:', e)
      this.submitError = e.response?.data?.detail || 'Failed to save metadata to catalog.'
    }
    finally {
      this.isSavingCatalog = false
    }
  }

  async saveAndPushToAda() {
    this.isSavingAda = true
    this.submitError = ''
    this.submitSuccess = ''

    try {
      const data = JSON.parse(JSON.stringify(this.metadata))
      await populateOnSave(data)

      // Step 1: Save to catalog
      const catalogResp = await axios.post(`${CATALOG_API}/records/`, {
        profile: this.profileId,
        jsonld: data,
        status: 'draft',
      }, {
        headers: { 'Content-Type': 'application/json' },
        params: { access_token: User.$state.orcidAccessToken },
      })

      const recordId = catalogResp.data.id

      // Step 2: Push to ADA if session exists
      if (this.sessionId) {
        await axios.post(`${ADA_BRIDGE_API}/bundle/${this.sessionId}/submit/`, {
          catalog_record_id: recordId,
        }, {
          params: { access_token: User.$state.orcidAccessToken },
        })
      }
      else {
        // Direct push via ada-bridge push endpoint
        await axios.post(`${ADA_BRIDGE_API}/push/${recordId}/`, {}, {
          params: { access_token: User.$state.orcidAccessToken },
        })
      }

      this.submitSuccess = 'Metadata saved to catalog and pushed to ADA.'
      Notifications.toast({ message: 'Metadata saved and pushed to ADA!', type: 'success' })
      this.emitSaved({ catalogRecordId: recordId, pushedToAda: true })
    }
    catch (e: any) {
      console.error('Failed to save and push to ADA:', e)
      const adaError = e.response?.data?.ada_error
      if (adaError) {
        this.submitError = `ADA API error: ${JSON.stringify(adaError)}`
      }
      else {
        this.submitError = e.response?.data?.detail || 'Failed to save and push to ADA.'
      }
    }
    finally {
      this.isSavingAda = false
    }
  }
}

export default toNative(BundleReviewStep)
</script>
