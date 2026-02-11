<template>
  <v-container class="bundle-wizard px-4">
    <h1 class="text-h4 mb-2">
      ADA Bundle Wizard
    </h1>
    <p class="text-body-1 text-medium-emphasis mb-4">
      Upload a data bundle, review files, fill metadata, and push to ADA.
    </p>
    <v-divider class="mb-6" />

    <!-- Product YAML file picker dialog -->
    <v-dialog v-model="showYamlPicker" max-width="600" persistent>
      <v-card>
        <v-card-title class="text-h6">
          Select Product YAML
        </v-card-title>
        <v-card-subtitle>
          No <code>product.yaml</code> was found automatically.
          Select the product metadata file from the bundle, or skip to enter it manually.
        </v-card-subtitle>
        <v-card-text>
          <v-list v-if="yamlFiles.length" density="compact" class="yaml-file-list">
            <v-list-item
              v-for="f in yamlFiles"
              :key="f"
              :value="f"
              :active="selectedYamlFile === f"
              color="primary"
              @click="selectedYamlFile = f"
            >
              <template #prepend>
                <v-icon>mdi-file-document-outline</v-icon>
              </template>
              <v-list-item-title>{{ f }}</v-list-item-title>
            </v-list-item>
          </v-list>
          <v-alert v-else type="info" variant="tonal" class="mt-2">
            No YAML files found in the bundle.
          </v-alert>
          <v-alert v-if="yamlPickerError" type="error" variant="outlined" class="mt-3">
            {{ yamlPickerError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" @click="onSkipYamlPicker">
            Skip — Enter Manually
          </v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="elevated"
            :disabled="!selectedYamlFile"
            :loading="isSelectingYaml"
            @click="onConfirmYamlPicker"
          >
            Use Selected File
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-stepper
      v-model="currentStep"
      :items="stepItems"
      alt-labels
      flat
    >
      <template #[`item.1`]>
        <bundle-upload-step
          @uploaded="onUploaded"
        />
      </template>

      <template #[`item.2`]>
        <product-form-step
          :session-id="sessionId"
          @saved="onProductSaved"
          @back="currentStep = 1"
        />
      </template>

      <template #[`item.3`]>
        <file-review-step
          :introspection-result="introspectionResult"
          :data-component-type="dataComponentType"
          @continue="onFileReviewContinue"
          @back="goBackFromFileReview"
        />
      </template>

      <template #[`item.4`]>
        <metadata-form-step
          :session-data="sessionData"
          :bundle-files="includedFiles"
          @continue="onMetadataContinue"
          @back="currentStep = 3"
        />
      </template>

      <template #[`item.5`]>
        <bundle-review-step
          :metadata="metadataFormData"
          :profile-id="metadataProfileId"
          :profile-key="metadataProfileKey"
          :session-id="sessionId"
          :files="includedFiles"
          @saved="onSubmitted"
          @back="currentStep = 4"
        />
      </template>
    </v-stepper>
  </v-container>
</template>

<script lang="ts">
import { Component, toNative, Vue } from 'vue-facing-decorator'
import { useRoute, useRouter } from 'vue-router'
import { Notifications } from '@cznethub/cznet-vue-core'
import axios from 'axios'
import User from '~/models/user.model'
import BundleUploadStep from './BundleUploadStep.vue'
import ProductFormStep from './ProductFormStep.vue'
import FileReviewStep from './FileReviewStep.vue'
import MetadataFormStep from './MetadataFormStep.vue'
import BundleReviewStep from './BundleReviewStep.vue'

const ADA_BRIDGE_API = '/api/ada-bridge'

@Component({
  name: 'bundle-wizard',
  components: {
    BundleUploadStep,
    ProductFormStep,
    FileReviewStep,
    MetadataFormStep,
    BundleReviewStep,
  },
})
class BundleWizard extends Vue {
  route = useRoute()
  router = useRouter()

  currentStep = 1
  sessionId = ''
  sessionData: any = null
  introspectionResult: any = null
  hasProductYaml = false
  includedFiles: any[] = []
  metadataFormData: any = {}
  metadataProfileId: number = 0
  metadataProfileKey = ''
  dataComponentType = ''

  // YAML file picker dialog state
  showYamlPicker = false
  yamlFiles: string[] = []
  selectedYamlFile = ''
  isSelectingYaml = false
  yamlPickerError = ''

  get stepItems() {
    const items = [
      { title: 'Upload', value: 1 },
    ]

    if (!this.hasProductYaml) {
      items.push({ title: 'Product Info', value: 2 })
    }

    items.push(
      { title: 'File Review', value: 3 },
      { title: 'Metadata', value: 4 },
      { title: 'Review', value: 5 },
    )

    return items
  }

  onUploaded(sessionData: any) {
    this.sessionData = sessionData
    this.sessionId = sessionData.session_id
    this.introspectionResult = sessionData.introspection_result
    this.hasProductYaml = !!sessionData.product_yaml
    this.dataComponentType = sessionData.product_yaml?.dataComponentType || ''

    if (this.hasProductYaml) {
      // Skip product form, go to file review
      this.currentStep = 3
    }
    else {
      // Show file picker dialog so user can select the product YAML
      const manifest: string[] = sessionData.introspection_result?.manifest || []
      this.yamlFiles = manifest.filter((f: string) => {
        const lower = f.toLowerCase()
        return lower.endsWith('.yaml') || lower.endsWith('.yml')
      })
      this.selectedYamlFile = ''
      this.yamlPickerError = ''
      this.showYamlPicker = true
    }
  }

  async onConfirmYamlPicker() {
    if (!this.selectedYamlFile) return

    this.isSelectingYaml = true
    this.yamlPickerError = ''

    try {
      // Tell the backend to parse the selected file as product YAML
      await axios.post(
        `${ADA_BRIDGE_API}/bundle/${this.sessionId}/select-product-yaml/`,
        { filepath: this.selectedYamlFile },
        { params: { access_token: User.$state.orcidAccessToken } },
      )

      // Re-run introspection now that product_yaml is set
      await axios.post(
        `${ADA_BRIDGE_API}/bundle/${this.sessionId}/introspect/`,
        {},
        { params: { access_token: User.$state.orcidAccessToken } },
      )

      // Fetch updated session
      const resp = await axios.get(
        `${ADA_BRIDGE_API}/bundle/${this.sessionId}/`,
        { params: { access_token: User.$state.orcidAccessToken } },
      )

      this.sessionData = resp.data
      this.introspectionResult = resp.data.introspection_result
      this.hasProductYaml = !!resp.data.product_yaml
      this.dataComponentType = resp.data.product_yaml?.dataComponentType || ''
      this.showYamlPicker = false
      this.currentStep = 3 // Skip to file review
    }
    catch (e: any) {
      console.error('Failed to select product YAML:', e)
      this.yamlPickerError = e.response?.data?.detail || 'Failed to parse selected file as YAML.'
    }
    finally {
      this.isSelectingYaml = false
    }
  }

  onSkipYamlPicker() {
    this.showYamlPicker = false
    this.currentStep = 2 // Go to manual product form
  }

  onProductSaved(sessionData: any) {
    this.sessionData = sessionData
    this.introspectionResult = sessionData.introspection_result
    this.hasProductYaml = true
    this.currentStep = 3
  }

  goBackFromFileReview() {
    this.currentStep = this.hasProductYaml ? 1 : 2
  }

  onFileReviewContinue(files: any[]) {
    this.includedFiles = files
    this.currentStep = 4
  }

  onMetadataContinue(result: { data: any; profileId: number; profileKey: string }) {
    this.metadataFormData = result.data
    this.metadataProfileId = result.profileId
    this.metadataProfileKey = result.profileKey
    this.currentStep = 5
  }

  onSubmitted(result: any) {
    Notifications.toast({
      message: result.pushedToAda
        ? 'Bundle metadata saved and pushed to ADA!'
        : 'Bundle metadata saved to catalog.',
      type: 'success',
    })
    this.router.push({ name: 'submissions' })
  }
}

export default toNative(BundleWizard)
</script>

<style lang="scss" scoped>
.bundle-wizard {
  max-width: 1200px;
}

.yaml-file-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}
</style>
