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
      <v-alert
        v-if="adaStatus"
        class="mb-4"
        :type="adaStatus === 'error' ? 'error' : 'success'"
        variant="outlined"
        density="compact"
      >
        <div class="text-black">
          <strong>ADA Status:</strong> {{ adaStatus }}
          <span v-if="adaDoi" class="ml-2">| <strong>DOI:</strong> {{ adaDoi }}</span>
        </div>
      </v-alert>

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
        <v-btn
          v-if="isAdaProfile"
          color="deep-purple"
          variant="elevated"
          class="ml-2"
          :loading="isSubmittingToAda"
          :disabled="!isEditMode || hasUnsavedChanges"
          @click="onSubmitToAda"
        >
          Submit to ADA
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
              :model-value="formData"
              v-model:is-valid="tabValidity[index]"
              :schema="schema"
              :uischema="getCategoryUischema(index)"
              :config="config"
              @update:errors="onUpdateErrors"
              @update:model-value="onFormModelUpdate"
            />
          </v-tabs-window-item>
        </v-tabs-window>
      </template>

      <cz-form
        v-else
        ref="form"
        :model-value="formData"
        v-model:is-valid="isValid"
        :schema="schema"
        :uischema="uischema"
        :config="config"
        @update:errors="onUpdateErrors"
        @update:model-value="onFormModelUpdate"
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
        <v-btn
          v-if="isAdaProfile"
          color="deep-purple"
          variant="elevated"
          class="ml-2"
          :loading="isSubmittingToAda"
          :disabled="!isEditMode || hasUnsavedChanges"
          @click="onSubmitToAda"
        >
          Submit to ADA
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

    <v-dialog
      v-model="isSubmittingToAda"
      no-click-animation
      hide-overlay
      persistent
      width="300"
    >
      <v-card class="py-4" color="deep-purple" dark>
        <v-card-text>
          <p class="mb-4 text-center text-body-2">
            Submitting to ADA...
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
import { toRaw } from 'vue'
import axios from 'axios'
import User from '~/models/user.model'
import { hasUnsavedChangesGuard } from '~/guards'
import { fetchUserInfo, generateVariableId, populateMaintainer, populateOnLoad, populateOnSave } from '~/services/catalog'

const CATALOG_API = '/api/catalog'
const ADD_VARIABLE_SENTINEL = '+ Add new variable...'

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
  isSubmittingToAda = false
  adaStatus: string | null = null
  adaDoi: string | null = null
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
  _categoryUischemaCache: Map<number, any> = new Map()
  _lastVariableNames: string[] | null = null

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

  /** Return the raw (un-Proxied) data object so JsonForms receives the same
   *  reference it emitted, preventing unnecessary full core re-initializations. */
  get formData() {
    return toRaw(this.data)
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
      CDIFxas: 'CDIF XAS Metadata',
    }
    return profileNames[this.profileKey] || 'Metadata'
  }

  get isAdaProfile(): boolean {
    return this.profileKey.startsWith('ada')
  }

  get isCategorization(): boolean {
    return this.uischema?.type === 'Categorization'
  }

  get categories(): { label: string; elements: any[] }[] {
    if (!this.isCategorization) return []
    return this.uischema.elements || []
  }

  getCategoryUischema(index: number) {
    const cached = this._categoryUischemaCache.get(index)
    if (cached) return cached

    const category = this.categories[index]
    if (!category) return { type: 'VerticalLayout', elements: [] }
    const uischema = {
      type: 'VerticalLayout',
      elements: category.elements || [],
    }
    this._categoryUischemaCache.set(index, uischema)
    return uischema
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
      const resp = await axios.get(`${CATALOG_API}/profiles/${this.profileKey}/`)
      this.profileId = resp.data.id
      this.schema = resp.data.schema
      this.uischema = resp.data.uischema
      this._categoryUischemaCache.clear()
      this.data = resp.data.defaults

      // Flatten distribution schema from array to object so the uischema
      // can scope directly into archive properties and hasPart file list.
      this._flattenDistributionSchema()

      // Populate required metadata fields with initial values
      populateOnLoad(this.data, this.schema)

      // Unwrap distribution array → single object (matches flattened schema)
      if (Array.isArray(this.data['schema:distribution'])) {
        this.data['schema:distribution'] = this.data['schema:distribution'][0] || {}
      }

      // Set profile-specific productType default from schema (new records only).
      // The conversion pipeline flattens additionalType from array to string
      // with oneOf so CzForm renders a labeled dropdown.
      const atSchema = this.schema?.properties?.['schema:additionalType']
      const atOneOf = atSchema?.oneOf
      const atEnum = atSchema?.enum
      if (!this.route.query.record) {
        if (atOneOf?.length) {
          this.data['schema:additionalType'] = atOneOf[0].const
        } else if (atEnum?.length) {
          this.data['schema:additionalType'] = atEnum[0]
        }
      }

      // If editing an existing record, load it
      const recordParam = this.route.query.record as string
      if (recordParam) {
        const recordResp = await axios.get(`${CATALOG_API}/records/${recordParam}/`, {
          params: { access_token: User.$state.orcidAccessToken },
        })
        this.data = recordResp.data.jsonld
        this.recordId = recordResp.data.id
        this.identifier = recordResp.data.identifier

        // Normalize imported data to match adaProduct schema expectations
        this._normalizeImportedData()

        // Unwrap additionalType array → string (matches flattened schema)
        this._unwrapAdditionalType()

        // Unwrap distribution array → object (matches flattened schema)
        if (Array.isArray(this.data['schema:distribution'])) {
          this.data['schema:distribution'] = this.data['schema:distribution'][0] || {}
        }

        // Unwrap encodingFormat arrays → strings (schema injection converts
        // these to single-string for rule conditions; serializer wraps back)
        this._unwrapEncodingFormats()

        // Load ADA status if this is an ADA profile record
        if (this.isAdaProfile) {
          this._loadAdaStatus()
        }
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

  onFormModelUpdate(newData: any) {
    // Check if any physicalMapping variable was set to the sentinel
    if (this._clearSentinelAndOpenDialog(newData)) {
      this.data = newData
      return  // Don't trigger onDataChange — the field was just cleared
    }
    this.data = newData
    this.onDataChange(newData)
  }

  /**
   * Walk the data tree looking for any cdi:formats_InstanceVariable set to
   * the "Add new variable" sentinel. If found, clear it and open the dialog.
   */
  _clearSentinelAndOpenDialog(node: any): boolean {
    if (!node || typeof node !== 'object') return false
    if (Array.isArray(node)) {
      for (const item of node) {
        if (this._clearSentinelAndOpenDialog(item)) return true
      }
      return false
    }
    if (node['cdi:formats_InstanceVariable'] === ADD_VARIABLE_SENTINEL) {
      node['cdi:formats_InstanceVariable'] = ''
      this.showNewVariableDialog = true
      return true
    }
    for (const key of Object.keys(node)) {
      if (this._clearSentinelAndOpenDialog(node[key])) return true
    }
    return false
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

    // Build enum of variable names (users see names; we convert to @id on save)
    const nameEnum = variables.map(v => v.name)

    // Only mutate schema when variable names actually changed — schema
    // mutations cause CzForm to re-render which resets form fields.
    if (this._lastVariableNames !== null) {
      const same = nameEnum.length === this._lastVariableNames.length
        && nameEnum.every((n, i) => n === this._lastVariableNames![i])
      if (same)
        return
    }

    this._lastVariableNames = nameEnum

    // Append sentinel option to let users create a new variable from the dropdown
    const enumWithAdd = [...nameEnum, ADD_VARIABLE_SENTINEL]

    // Deep-walk schema to find all cdi:formats_InstanceVariable properties and set enum
    this._setFormatsVariableEnum(this.schema, enumWithAdd)

    // Trigger CzForm re-init by creating a new schema reference.
    // The _lastVariableNames guard above ensures this only fires
    // when variable names actually change (not on every keystroke).
    this.schema = { ...this.schema }
    this._categoryUischemaCache.clear()
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
        // Unwrap distribution array → object (matches flattened schema)
        if (Array.isArray(parsed['schema:distribution'])) {
          parsed['schema:distribution'] = parsed['schema:distribution'][0] || {}
        }
        this.data = parsed
        // Normalize imported data and unwrap flattened fields
        this._normalizeImportedData()
        this._unwrapAdditionalType()
        this._unwrapEncodingFormats()
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

  /** Convert schema:distribution from array schema to object schema so
   *  the uischema can scope directly into its properties. */
  _flattenDistributionSchema() {
    const dist = this.schema?.properties?.['schema:distribution']
    if (dist?.type === 'array' && dist.items) {
      this.schema.properties['schema:distribution'] = {
        ...dist.items,
        description: dist.description || dist.items.description,
      }
    }
  }

  /** Unwrap encodingFormat arrays to plain strings in distribution and
   *  hasPart items. The injected schema uses single-string encodingFormat
   *  for rule conditions; the serializer wraps back to arrays on save. */
  _unwrapEncodingFormats() {
    const dist = this.data['schema:distribution']
    if (!dist || typeof dist !== 'object') return

    if (Array.isArray(dist['schema:encodingFormat'])) {
      dist['schema:encodingFormat'] = dist['schema:encodingFormat'][0] || ''
    }
    for (const part of dist['schema:hasPart'] || []) {
      if (part && Array.isArray(part['schema:encodingFormat'])) {
        part['schema:encodingFormat'] = part['schema:encodingFormat'][0] || ''
      }
    }
  }

  /** Unwrap schema:additionalType array to plain string. The conversion
   *  pipeline flattens this to a string with oneOf for CzForm's dropdown
   *  renderer; we wrap back to array on save. */
  _unwrapAdditionalType() {
    if (Array.isArray(this.data['schema:additionalType'])) {
      this.data['schema:additionalType'] = this.data['schema:additionalType'][0] || ''
    }
  }

  /** Normalize imported JSON-LD to match adaProduct schema expectations.
   *  Handles structural differences between old ADA format and current schema. */
  _normalizeImportedData() {
    const d = this.data
    if (!d) return

    // schema:identifier — convert object {schema:value, schema:url} to plain string (DOI)
    const ident = d['schema:identifier']
    if (ident && typeof ident === 'object') {
      d['schema:identifier'] = ident['schema:value'] || ident['schema:url'] || ''
    }

    // schema:sdDatePublished — convert date to date-time
    const subj = d['schema:subjectOf']
    if (subj && typeof subj === 'object') {
      const sdp = subj['schema:sdDatePublished']
      if (sdp && typeof sdp === 'string' && !sdp.includes('T')) {
        subj['schema:sdDatePublished'] = sdp + 'T00:00:00Z'
      }
    }

    // schema:datePublished — convert date to date-time if needed
    if (d['schema:datePublished'] && typeof d['schema:datePublished'] === 'string'
      && !d['schema:datePublished'].includes('T')) {
      d['schema:datePublished'] = d['schema:datePublished'] + 'T00:00:00Z'
    }

    // schema:measurementTechnique — schema expects object with specific structure;
    // ensure @type is array if present as string
    const mt = d['schema:measurementTechnique']
    if (mt && typeof mt === 'object' && typeof mt['@type'] === 'string') {
      mt['@type'] = [mt['@type']]
    }

    // schema:license — schema expects array of objects, old format has array of strings
    if (Array.isArray(d['schema:license'])) {
      d['schema:license'] = d['schema:license'].map((lic: any) => {
        if (typeof lic === 'string') {
          return { '@type': 'schema:CreativeWork', 'schema:name': lic }
        }
        return lic
      })
    }

    // schema:funding — if entry has description but no name, use description as grant name
    for (const fund of d['schema:funding'] || []) {
      if (fund && typeof fund === 'object' && fund['schema:description'] && !fund['schema:name']) {
        fund['schema:name'] = fund['schema:description']
      }
    }
  }

  async _loadAdaStatus() {
    if (!this.recordId) return
    try {
      const resp = await axios.get(`/api/ada-bridge/status/${this.recordId}/`, {
        params: { access_token: User.$state.orcidAccessToken },
      })
      this.adaStatus = resp.data.ada_status || null
      this.adaDoi = resp.data.ada_doi || null
    }
    catch {
      // No ADA link yet — that's fine
      this.adaStatus = null
      this.adaDoi = null
    }
  }

  async onSubmitToAda() {
    if (!this.recordId) return
    this.isSubmittingToAda = true
    this.errorMessage = ''

    try {
      // Save locally first (same as onSave but don't navigate away)
      await populateOnSave(this.data)

      const saveData = { ...this.data }
      if (saveData['schema:additionalType'] && !Array.isArray(saveData['schema:additionalType'])) {
        saveData['schema:additionalType'] = [saveData['schema:additionalType']]
      }
      if (saveData['schema:distribution'] && !Array.isArray(saveData['schema:distribution'])) {
        saveData['schema:distribution'] = [saveData['schema:distribution']]
      }

      await axios.patch(`${CATALOG_API}/records/${this.recordId}/`, {
        profile: this.profileId,
        jsonld: saveData,
      }, {
        headers: { 'Content-Type': 'application/json' },
        params: { access_token: User.$state.orcidAccessToken },
      })

      // Push to ADA
      const pushResp = await axios.post(`/api/ada-bridge/push/${this.recordId}/`, {}, {
        params: { access_token: User.$state.orcidAccessToken },
      })

      this.adaStatus = pushResp.data.ada_status || 'pushed'
      this.adaDoi = pushResp.data.ada_doi || null
      this.hasUnsavedChanges = false

      Notifications.toast({
        message: 'Record submitted to ADA successfully!',
        type: 'success',
      })
    }
    catch (e: any) {
      console.error('Failed to submit to ADA:', e)
      if (e.response?.data?.ada_error) {
        this.errorMessage = `ADA error: ${JSON.stringify(e.response.data.ada_error)}`
      }
      else {
        Notifications.toast({
          message: 'Failed to submit to ADA',
          type: 'error',
        })
      }
    }
    finally {
      this.isSubmittingToAda = false
    }
  }

  async onSave() {
    this.isSaving = true

    try {
      // Auto-populate @id, schema:about, and schema:sdDatePublished
      await populateOnSave(this.data)

      // Wrap flattened fields back to arrays for the canonical JSON-LD schema
      const saveData = { ...this.data }
      if (saveData['schema:additionalType'] && !Array.isArray(saveData['schema:additionalType'])) {
        saveData['schema:additionalType'] = [saveData['schema:additionalType']]
      }
      if (saveData['schema:distribution'] && !Array.isArray(saveData['schema:distribution'])) {
        saveData['schema:distribution'] = [saveData['schema:distribution']]
      }

      const url = this.recordId
        ? `${CATALOG_API}/records/${this.recordId}/`
        : `${CATALOG_API}/records/`
      const method = this.recordId ? 'patch' : 'post'

      const response = await axios[method](url, {
        profile: this.profileId,
        jsonld: saveData,
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
      const detail = e.response?.data
      if (e.response?.status === 400 && detail?.jsonld) {
        this.errorMessage = 'Validation failed'
        this.validationErrors = detail.jsonld
      }
      else {
        this.errorMessage = detail
          ? `Save failed (${e.response?.status}): ${JSON.stringify(detail)}`
          : 'Failed to save metadata record'
        this.validationErrors = []
        if (!detail) {
          Notifications.toast({
            message: 'Failed to save metadata record',
            type: 'error',
          })
        }
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
