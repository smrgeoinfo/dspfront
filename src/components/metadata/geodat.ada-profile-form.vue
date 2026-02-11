<template>
  <v-container class="geodat-ada-profile-form px-4">
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

    <!-- New Variable dialog -->
    <v-dialog v-model="showNewVariableDialog" max-width="520" persistent>
      <v-card>
        <v-card-title class="text-h6">
          New Variable
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newVariable.name"
            label="Name *"
            variant="outlined"
            density="compact"
            hint="Label for this variable as it appears in the dataset"
            persistent-hint
            class="mb-3"
          />
          <v-textarea
            v-model="newVariable.description"
            label="Description *"
            variant="outlined"
            density="compact"
            rows="2"
            hint="What this variable represents"
            persistent-hint
            class="mb-3"
          />
          <v-text-field
            v-model="newVariable.unitText"
            label="Unit (optional)"
            variant="outlined"
            density="compact"
            hint="e.g. degrees Celsius, mg/L, meters"
            persistent-hint
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showNewVariableDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :disabled="!newVariable.name || !newVariable.description"
            @click="onCreateVariable"
          >
            Add Variable
          </v-btn>
        </v-card-actions>
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
import { fetchUserInfo, generateVariableId, populateMaintainer, populateOnLoad, populateOnSave } from '~/services/catalog'

const CATALOG_API = '/api/catalog'

@Component({
  name: 'geodat-ada-profile-form',
  components: {
    CzForm,
  },
})
class GeodatAdaProfileForm extends Vue {
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
  profileId: number | null = null
  recordId: string | null = null
  showNewVariableDialog = false
  newVariable = { name: '', description: '', unitText: '' }

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

  updated() {
    this.$nextTick(() => this._injectNewVariableButtons())
  }

  /**
   * Inject a "New Variable" button into each Physical Mapping array toolbar.
   * CzForm doesn't support custom buttons in UISchema, so we find the
   * rendered array controls by their label text and inject a button into
   * the toolbar next to the existing "+" add button.
   */
  _injectNewVariableButtons() {
    const container = this.$el as HTMLElement
    if (!container) return

    // Find all array labels (both array-list and list-with-detail variants)
    const labels = container.querySelectorAll('.array-list-label, .list-with-detail-label')
    for (const label of labels) {
      if (label.textContent?.trim() !== 'Physical Mapping') continue

      // Find the parent toolbar
      const toolbar = label.closest('.array-list-toolbar, .list-with-detail-toolbar')
      if (!toolbar) continue

      // Don't inject if already present
      if (toolbar.querySelector('.new-variable-btn')) continue

      const btn = document.createElement('button')
      btn.className = 'new-variable-btn v-btn v-btn--density-compact v-btn--size-small v-btn--variant-tonal v-theme--light'
      btn.type = 'button'
      btn.style.cssText = 'margin-left: 8px; font-size: 0.75rem; padding: 0 8px; height: 28px; min-width: auto; border-radius: 4px; cursor: pointer; background-color: rgb(var(--v-theme-primary)); color: white;'
      btn.textContent = '+ New Variable'
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.showNewVariableDialog = true
      })

      // Insert after the label, before the add button
      const addBtn = toolbar.querySelector('.array-list-add, .list-with-detail-add')
      if (addBtn) {
        toolbar.insertBefore(btn, addBtn)
      }
      else {
        toolbar.appendChild(btn)
      }
    }
  }

  async loadSchemas() {
    this.isLoading = true
    this.errorMessage = ''

    try {
      const resp = await axios.get(`${CATALOG_API}/profiles/${this.profileKey}/`)
      this.profileId = resp.data.id
      this.schema = resp.data.schema
      this.uischema = resp.data.uischema
      this.data = resp.data.defaults

      // Populate required metadata fields with initial values
      populateOnLoad(this.data)

      // If editing an existing record, load it
      const recordParam = this.route.query.record as string
      if (recordParam) {
        const recordResp = await axios.get(`${CATALOG_API}/records/${recordParam}/`, {
          params: { access_token: User.$state.orcidAccessToken },
        })
        this.data = recordResp.data.jsonld
        this.recordId = recordResp.data.id
        this.identifier = recordResp.data.identifier
      }

      // Auto-populate maintainer with logged-in user info (new records only)
      if (!recordParam && User.$state.isLoggedIn) {
        const userInfo = await fetchUserInfo()
        if (userInfo) {
          populateMaintainer(this.data, userInfo)
          this.data = { ...this.data }
        }
      }

      // Populate variable name dropdowns in physicalMapping
      await this.updateVariableOptions()
    }
    catch (e: any) {
      console.error('Failed to load schemas:', e)
      this.errorMessage = `Failed to load form schema for profile "${this.profileKey}".`
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

    this.updateVariableOptions()
  }

  /**
   * Update the enum on all cdi:formats_InstanceVariable schema properties
   * so physicalMapping dropdowns reflect the current variableMeasured names.
   */
  async updateVariableOptions() {
    if (!this.schema || !this.data)
      return

    const variables: { name: string; id: string }[] = []
    for (const v of this.data['schema:variableMeasured'] || []) {
      if (v && typeof v === 'object' && v['schema:name']) {
        const name = v['schema:name']
        const id = v['@id'] || await generateVariableId(name)
        if (!v['@id'])
          v['@id'] = id
        variables.push({ name, id })
      }
    }

    if (!variables.length)
      return

    // Build enum of variable names (users see names; we convert to @id on save)
    const nameEnum = variables.map(v => v.name)

    // Deep-walk schema to find all cdi:formats_InstanceVariable properties and set enum
    this._setFormatsVariableEnum(this.schema, nameEnum)
  }

  /**
   * Recursively walk the JSON Schema tree and set enum on any
   * cdi:formats_InstanceVariable string property.
   */
  _setFormatsVariableEnum(node: any, enumValues: string[]) {
    if (!node || typeof node !== 'object')
      return
    if (Array.isArray(node)) {
      for (const item of node)
        this._setFormatsVariableEnum(item, enumValues)
      return
    }

    // Check if this node has properties containing cdi:formats_InstanceVariable
    const props = node.properties
    if (props && props['cdi:formats_InstanceVariable']) {
      const fiv = props['cdi:formats_InstanceVariable']
      if (fiv.type === 'string')
        fiv.enum = enumValues
    }

    // Recurse into sub-schemas
    if (props) {
      for (const key of Object.keys(props))
        this._setFormatsVariableEnum(props[key], enumValues)
    }
    if (node.items)
      this._setFormatsVariableEnum(node.items, enumValues)
  }

  /**
   * Create a new variableMeasured item from the dialog and update the dropdown.
   */
  async onCreateVariable() {
    const name = this.newVariable.name.trim()
    const description = this.newVariable.description.trim()
    if (!name || !description)
      return

    const id = await generateVariableId(name)
    const variable: any = {
      '@type': ['schema:PropertyValue', 'cdi:InstanceVariable'],
      '@id': id,
      'schema:name': name,
      'schema:description': description,
    }
    if (this.newVariable.unitText.trim())
      variable['schema:unitText'] = this.newVariable.unitText.trim()

    // Ensure variableMeasured array exists
    if (!this.data['schema:variableMeasured'])
      this.data['schema:variableMeasured'] = []

    this.data['schema:variableMeasured'].push(variable)

    // Trigger Vue reactivity
    this.data = { ...this.data }

    // Update the Variable dropdowns in physicalMapping
    await this.updateVariableOptions()

    // Reset dialog
    this.newVariable = { name: '', description: '', unitText: '' }
    this.showNewVariableDialog = false

    Notifications.toast({
      message: `Variable "${name}" added.`,
      type: 'success',
    })
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
      // Auto-populate @id, schema:about, and schema:sdDatePublished
      await populateOnSave(this.data)

      const url = this.recordId
        ? `${CATALOG_API}/records/${this.recordId}/`
        : `${CATALOG_API}/records/`
      const method = this.recordId ? 'patch' : 'post'

      const response = await axios[method](url, {
        profile: this.profileId,
        jsonld: this.data,
        ...(this.recordId ? {} : { status: 'draft' }),
      }, {
        headers: { 'Content-Type': 'application/json' },
        params: { access_token: User.$state.orcidAccessToken },
      })

      if (response.status === 201 || response.status === 200) {
        this.recordId = response.data.id
        this.identifier = response.data.identifier
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
      if (e.response?.status === 400 && e.response?.data?.jsonld) {
        this.errorMessage = 'Validation failed'
        this.validationErrors = e.response.data.jsonld
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

export default toNative(GeodatAdaProfileForm)
</script>

<style lang="scss" scoped>
.geodat-ada-profile-form {
  max-width: 1200px;
}
</style>

<style lang="scss">
.geodat-ada-profile-form {
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
  // Smaller description/hint text under fields
  .v-messages,
  .v-messages__message,
  .message--text {
    font-size: 0.7rem !important;
    line-height: 1.0 !important;
    margin-bottom: 6px !important;
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
