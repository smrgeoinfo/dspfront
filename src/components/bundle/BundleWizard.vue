<template>
  <v-container class="bundle-wizard px-4">
    <h1 class="text-h4 mb-2">
      ADA Bundle Wizard
    </h1>
    <p class="text-body-1 text-medium-emphasis mb-4">
      Upload a data bundle, review files, fill metadata, and push to ADA.
    </p>
    <v-divider class="mb-6" />

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
import BundleUploadStep from './BundleUploadStep.vue'
import ProductFormStep from './ProductFormStep.vue'
import FileReviewStep from './FileReviewStep.vue'
import MetadataFormStep from './MetadataFormStep.vue'
import BundleReviewStep from './BundleReviewStep.vue'

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

    if (this.hasProductYaml) {
      // Skip product form, go to file review
      this.currentStep = 3
    }
    else {
      this.currentStep = 2
    }
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
</style>
