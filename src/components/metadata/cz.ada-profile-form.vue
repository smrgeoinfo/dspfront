<template>
  <v-container class="cz-ada-profile-form px-4">
    <h1 class="text-h4">
      {{ formTitle }}
    </h1>
    <v-divider class="mb-4" />

    <v-alert
      v-if="!isLoading && schema"
      class="text-subtitle-1 my-8"
      border="start"
      border-color="primary"
      type="info"
      variant="outlined"
      density="compact"
    >
      <div class="text-black">
        <div class="font-weight-bold">
          Instructions
        </div>
        <p>
          Fill in the required fields (marked with * and highlighted in red).
          Press the "Save" button to store your metadata record.
        </p>
      </div>
    </v-alert>

    <div v-if="errorMessage" class="mb-4">
      <v-alert type="error" variant="outlined">
        {{ errorMessage }}
        <ul v-if="validationErrors.length" class="mt-2 ml-4">
          <li v-for="(err, i) in validationErrors" :key="i" class="text-body-2">
            {{ err }}
          </li>
        </ul>
      </v-alert>
    </div>

    <div v-if="!isLoading && schema">
      <div class="d-flex justify-end mb-4">
        <v-btn
          variant="outlined"
          class="mr-auto"
          @click="triggerFileInput"
        >
          Load from File
        </v-btn>
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          style="display: none"
          @change="onFileSelected"
        >
        <v-btn
          variant="text"
          class="mr-2"
          @click="goToSubmissions"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="isSaving"
          @click="onSave"
        >
          {{ isEditMode ? 'Save Changes' : 'Save' }}
        </v-btn>
      </div>

      <template v-if="isCategorization">
        <v-tabs
          v-model="activeTab"
          color="primary"
          class="mb-4"
        >
          <v-tab
            v-for="(category, index) in categories"
            :key="index"
            :value="index"
          >
            {{ category.label }}
          </v-tab>
        </v-tabs>

        <v-tabs-window v-model="activeTab">
          <v-tabs-window-item
            v-for="(category, index) in categories"
            :key="index"
            :value="index"
          >
            <cz-form
              ref="form"
              v-model="data"
              v-model:is-valid="tabValidity[index]"
              :schema="schema"
              :uischema="getCategoryUischema(index)"
              :config="config"
              @update:errors="onUpdateErrors"
              @update:model-value="onDataChange"
            />
          </v-tabs-window-item>
        </v-tabs-window>
      </template>

      <cz-form
        v-else
        ref="form"
        v-model="data"
        v-model:is-valid="isValid"
        :schema="schema"
        :uischema="uischema"
        :config="config"
        @update:errors="onUpdateErrors"
        @update:model-value="onDataChange"
      />

      <div class="d-flex justify-end mt-4">
        <v-btn
          variant="text"
          class="mr-2"
          @click="goToSubmissions"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="isSaving"
          @click="onSave"
        >
          {{ isEditMode ? 'Save Changes' : 'Save' }}
        </v-btn>
      </div>
    </div>

    <div v-else-if="isLoading" class="d-flex justify-center mt-8">
      <v-progress-circular
        indeterminate
        color="primary"
      />
    </div>

    <v-dialog
      v-model="isSaving"
      no-click-animation
      hide-overlay
      persistent
      width="300"
    >
      <v-card class="py-4" color="primary" dark>
        <v-card-text>
          <p class="mb-4 text-center text-body-2">
            Saving...
          </p>
          <v-progress-linear
            indeterminate
            color="white"
            class="mb-0"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts">
import { CzForm, Notifications } from '@cznethub/cznet-vue-core'
import { Component, Hook, toNative, Vue } from 'vue-facing-decorator'
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import User from '~/models/user.model'
import { hasUnsavedChangesGuard } from '~/guards'

// TODO: Switch to GitHub Pages URL for production
// const BB_BASE_URL = 'https://smrgeoinfo.github.io/OCGbuildingBlockTest/build/jsonforms/profiles'
const BB_BASE_URL = 'http://localhost:8090/profiles'

@Component({
  name: 'cz-ada-profile-form',
  components: {
    CzForm,
  },
})
class CzAdaProfileForm extends Vue {
  route = useRoute()
  router = useRouter()

  schema: any = null
  uischema: any = null
  data: any = {}
  isValid = false
  isLoading = false
  isSaving = false
  errorMessage = ''
  validationErrors: string[] = []
  errors: { title: string; message: string }[] = []
  timesChanged = 0
  identifier = ''
  activeTab = 0
  tabValidity: boolean[] = []

  get config() {
    return {
      restrict: true,
      trim: false,
      showUnfocusedDescription: false,
      hideRequiredAsterisk: false,
      collapseNewItems: false,
      breakHorizontal: false,
      initCollapsed: false,
      hideAvatar: false,
      hideArraySummaryValidation: false,
      vuetify: {
        commonAttrs: {
          'density': 'compact',
          'variant': 'outlined',
          'persistent-hint': true,
          'hide-details': false,
        },
      },
    }
  }

  get profileKey(): string {
    return this.route.params.profile as string
  }

  get isEditMode(): boolean {
    return !!this.identifier
  }

  get formTitle(): string {
    const profileNames: Record<string, string> = {
      adaProduct: 'ADA Product Metadata',
      adaEMPA: 'ADA EMPA Product Metadata',
      adaXRD: 'ADA XRD Product Metadata',
      adaICPMS: 'ADA ICP-MS Product Metadata',
      adaVNMIR: 'ADA VNMIR Product Metadata',
    }
    return profileNames[this.profileKey] || 'ADA Metadata'
  }

  get isCategorization(): boolean {
    return this.uischema?.type === 'Categorization'
  }

  get categories(): { label: string; elements: any[] }[] {
    if (!this.isCategorization) return []
    return this.uischema.elements || []
  }

  getCategoryUischema(index: number) {
    const category = this.categories[index]
    if (!category) return { type: 'VerticalLayout', elements: [] }
    return {
      type: 'VerticalLayout',
      elements: category.elements || [],
    }
  }

  get hasUnsavedChanges(): boolean {
    return User.$state.hasUnsavedChanges
  }

  set hasUnsavedChanges(value: boolean) {
    User.commit((state) => {
      state.hasUnsavedChanges = value
    })
  }

  created() {
    this.loadSchemas()
  }

  async loadSchemas() {
    this.isLoading = true
    this.errorMessage = ''

    try {
      const baseUrl = `${BB_BASE_URL}/${this.profileKey}`
      const [schemaResp, uischemaResp, defaultsResp] = await Promise.all([
        axios.get(`${baseUrl}/schema.json`),
        axios.get(`${baseUrl}/uischema.json`),
        axios.get(`${baseUrl}/defaults.json`),
      ])

      this.schema = schemaResp.data
      this.uischema = uischemaResp.data
      this.data = defaultsResp.data
    }
    catch (e: any) {
      console.error('Failed to load schemas:', e)
      this.errorMessage = `Failed to load form schema for profile "${this.profileKey}". Please try again later.`
    }
    finally {
      this.isLoading = false
    }
  }

  onUpdateErrors(errors: { title: string; message: string }[]) {
    this.errors = errors
  }

  onDataChange(_data: any) {
    const changesDuringInstantiation = 3

    if (this.timesChanged <= changesDuringInstantiation)
      this.timesChanged = this.timesChanged + 1

    this.hasUnsavedChanges = this.timesChanged > changesDuringInstantiation
  }

  triggerFileInput() {
    (this.$refs.fileInput as HTMLInputElement).click()
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string)
        this.data = parsed
        this.timesChanged = 0
        this.hasUnsavedChanges = false
      }
      catch (err) {
        console.error('Failed to parse JSON file:', err)
        Notifications.toast({
          message: 'Failed to parse the selected file as JSON.',
          type: 'error',
        })
      }
    }
    reader.readAsText(file)
    // Reset so the same file can be re-selected
    input.value = ''
  }

  goToSubmissions() {
    this.router.push({ name: 'submissions' })
  }

  async onSave() {
    this.isSaving = true

    try {
      const response = await axios.post(
        '/api/metadata/ada/jsonld',
        this.data,
        {
          headers: { 'Content-Type': 'application/json' },
          params: { access_token: User.$state.orcidAccessToken },
        },
      )

      if (response.status === 201) {
        this.identifier = response.data.metadata?.identifier
        this.hasUnsavedChanges = false
        this.errorMessage = ''
        this.validationErrors = []

        Notifications.toast({
          message: 'Your metadata record has been saved!',
          type: 'success',
        })

        this.router.push({ name: 'submissions' })
      }
    }
    catch (e: any) {
      console.error('Failed to save:', e)
      if (e.response?.status === 422 && e.response?.data?.errors) {
        this.errorMessage = e.response.data.detail || 'Validation failed'
        this.validationErrors = e.response.data.errors
      }
      else {
        this.errorMessage = ''
        this.validationErrors = []
        Notifications.toast({
          message: 'Failed to save metadata record',
          type: 'error',
        })
      }
    }
    finally {
      this.isSaving = false
    }
  }

  @Hook
  beforeRouteLeave(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ) {
    hasUnsavedChangesGuard(to, from, next)
  }
}

export default toNative(CzAdaProfileForm)
</script>

<style lang="scss" scoped>
.cz-ada-profile-form {
  max-width: 1200px;
}
</style>

<style lang="scss">
.cz-ada-profile-form {
  // Reduce vertical margin between group panels (v-card.cz-group.my-5)
  .cz-group.my-5 {
    margin-top: 8px !important;
    margin-bottom: 8px !important;
  }
  // Reduce padding inside group card body
  .cz-group > .v-card-text {
    padding-top: 8px;
    padding-bottom: 4px;
  }
  // Tighter input rows
  .v-input {
    margin-bottom: 0 !important;
  }
  .v-input__details {
    min-height: 16px;
    padding-top: 2px;
  }
  // Compact layout items
  .vertical-layout-item,
  .horizontal-layout-item {
    padding-top: 0 !important;
    padding-bottom: 0 !important;
  }
  // Override control-wrapper and group-item my-5 (20px each) to tight spacing
  .control.my-5,
  .group-item {
    margin-top: 4px !important;
    margin-bottom: 4px !important;
  }
  .array-list-item {
    margin-bottom: 4px;
  }
  .v-tabs {
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  }
}
</style>
