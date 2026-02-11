<template>
  <v-card flat>
    <v-card-title class="text-h6">
      Metadata Form
    </v-card-title>
    <v-card-text>
      <div v-if="!selectedProfile" class="mb-4">
        <p class="text-body-1 mb-2">
          Select a metadata profile to fill in:
        </p>
        <v-select
          v-model="profileKey"
          :items="profiles"
          item-title="name"
          item-value="name"
          label="Metadata Profile"
          variant="outlined"
          density="compact"
          :loading="isLoadingProfiles"
        />
        <v-btn
          color="primary"
          variant="elevated"
          :disabled="!profileKey"
          @click="loadProfile"
        >
          Load Form
        </v-btn>
      </div>

      <div v-if="isLoadingSchema" class="d-flex justify-center mt-4">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <template v-if="schema && !isLoadingSchema">
        <div class="d-flex align-center mb-4">
          <v-chip color="primary" variant="outlined" class="mr-2">
            {{ profileKey }}
          </v-chip>
          <v-btn variant="text" size="small" @click="changeProfile">
            Change Profile
          </v-btn>
        </div>

        <!-- New Variable dialog trigger -->
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

        <div class="d-flex justify-end mb-4">
          <v-btn variant="outlined" class="mr-auto" @click="triggerFileInput">
            Load from File
          </v-btn>
          <input
            ref="fileInput"
            type="file"
            accept=".json"
            style="display: none"
            @change="onFileSelected"
          >
        </div>

        <template v-if="isCategorization">
          <v-tabs v-model="activeTab" color="primary" class="mb-4">
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
                :config="formConfig"
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
          :config="formConfig"
          @update:model-value="onDataChange"
        />
      </template>
    </v-card-text>

    <v-card-actions>
      <v-btn variant="text" @click="$emit('back')">
        Back
      </v-btn>
      <v-spacer />
      <v-btn
        color="primary"
        variant="elevated"
        :disabled="!schema"
        @click="onContinue"
      >
        Continue to Review
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { CzForm, Notifications } from '@cznethub/cznet-vue-core'
import { Component, Emit, Prop, toNative, Vue, Watch } from 'vue-facing-decorator'
import axios from 'axios'
import User from '~/models/user.model'
import { fetchUserInfo, generateVariableId, populateMaintainer, populateOnLoad } from '~/services/catalog'

const CATALOG_API = '/api/catalog'

@Component({
  name: 'metadata-form-step',
  components: { CzForm },
})
class MetadataFormStep extends Vue {
  @Prop({ default: null }) sessionData!: any
  @Prop({ default: () => [] }) bundleFiles!: any[]

  profiles: { name: string; description: string }[] = []
  profileKey = ''
  selectedProfile: any = null
  isLoadingProfiles = false
  isLoadingSchema = false

  schema: any = null
  uischema: any = null
  data: any = {}
  isValid = false
  activeTab = 0
  tabValidity: boolean[] = []
  profileId: number | null = null

  showNewVariableDialog = false
  newVariable = { name: '', description: '', unitText: '' }

  get formConfig() {
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

  async created() {
    await this.loadProfiles()
  }

  async loadProfiles() {
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

  async loadProfile() {
    if (!this.profileKey) return
    this.isLoadingSchema = true
    this.selectedProfile = this.profileKey

    try {
      const resp = await axios.get(`${CATALOG_API}/profiles/${this.profileKey}/`)
      this.profileId = resp.data.id
      this.schema = resp.data.schema
      this.uischema = resp.data.uischema
      this.data = resp.data.defaults || {}

      populateOnLoad(this.data)

      // Pre-populate from introspection if available
      if (this.sessionData?.jsonld_draft) {
        this.data = { ...this.data, ...this.sessionData.jsonld_draft }
      }

      // Pre-populate from bundle files — add variables from CSV columns
      this.prePopulateFromFiles()

      // Auto-populate maintainer
      if (User.$state.isLoggedIn) {
        const userInfo = await fetchUserInfo()
        if (userInfo) {
          populateMaintainer(this.data, userInfo)
          this.data = { ...this.data }
        }
      }

      await this.updateVariableOptions()
    }
    catch (e: any) {
      console.error('Failed to load profile schema:', e)
    }
    finally {
      this.isLoadingSchema = false
    }
  }

  prePopulateFromFiles() {
    if (!this.bundleFiles?.length) return

    const variables: any[] = this.data['schema:variableMeasured'] || []

    for (const file of this.bundleFiles) {
      if (file.inspection?.columns) {
        for (const col of file.inspection.columns) {
          const colName = typeof col === 'string' ? col : col.name
          if (!colName) continue
          const exists = variables.some((v: any) => v['schema:name'] === colName)
          if (!exists) {
            variables.push({
              '@type': ['schema:PropertyValue', 'cdi:InstanceVariable'],
              'schema:name': colName,
              'schema:description': col.dtype ? `${colName} (${col.dtype})` : colName,
            })
          }
        }
      }

      if (file.inspection?.variables) {
        for (const varInfo of file.inspection.variables) {
          const varName = typeof varInfo === 'string' ? varInfo : varInfo.name
          if (!varName) continue
          const exists = variables.some((v: any) => v['schema:name'] === varName)
          if (!exists) {
            variables.push({
              '@type': ['schema:PropertyValue', 'cdi:InstanceVariable'],
              'schema:name': varName,
              'schema:description': varInfo.long_name || varName,
            })
          }
        }
      }
    }

    if (variables.length) {
      this.data['schema:variableMeasured'] = variables
      this.data = { ...this.data }
    }
  }

  changeProfile() {
    this.selectedProfile = null
    this.schema = null
    this.uischema = null
  }

  onDataChange() {
    this.updateVariableOptions()
  }

  async updateVariableOptions() {
    if (!this.schema || !this.data) return

    const variables: { name: string; id: string }[] = []
    for (const v of this.data['schema:variableMeasured'] || []) {
      if (v && typeof v === 'object' && v['schema:name']) {
        const name = v['schema:name']
        const id = v['@id'] || await generateVariableId(name)
        if (!v['@id']) v['@id'] = id
        variables.push({ name, id })
      }
    }

    if (!variables.length) return

    const nameEnum = variables.map(v => v.name)
    this._setFormatsVariableEnum(this.schema, nameEnum)
  }

  _setFormatsVariableEnum(node: any, enumValues: string[]) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) this._setFormatsVariableEnum(item, enumValues)
      return
    }
    const props = node.properties
    if (props && props['cdi:formats_InstanceVariable']) {
      const fiv = props['cdi:formats_InstanceVariable']
      if (fiv.type === 'string') fiv.enum = enumValues
    }
    if (props) {
      for (const key of Object.keys(props))
        this._setFormatsVariableEnum(props[key], enumValues)
    }
    if (node.items) this._setFormatsVariableEnum(node.items, enumValues)
  }

  async onCreateVariable() {
    const name = this.newVariable.name.trim()
    const description = this.newVariable.description.trim()
    if (!name || !description) return

    const id = await generateVariableId(name)
    const variable: any = {
      '@type': ['schema:PropertyValue', 'cdi:InstanceVariable'],
      '@id': id,
      'schema:name': name,
      'schema:description': description,
    }
    if (this.newVariable.unitText.trim())
      variable['schema:unitText'] = this.newVariable.unitText.trim()

    if (!this.data['schema:variableMeasured'])
      this.data['schema:variableMeasured'] = []

    this.data['schema:variableMeasured'].push(variable)
    this.data = { ...this.data }

    await this.updateVariableOptions()

    this.newVariable = { name: '', description: '', unitText: '' }
    this.showNewVariableDialog = false

    Notifications.toast({ message: `Variable "${name}" added.`, type: 'success' })
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
      }
      catch (err) {
        console.error('Failed to parse JSON file:', err)
        Notifications.toast({ message: 'Failed to parse JSON file.', type: 'error' })
      }
    }
    reader.readAsText(file)
    input.value = ''
  }

  @Emit('continue')
  onContinue() {
    return {
      data: this.data,
      profileId: this.profileId,
      profileKey: this.profileKey,
    }
  }
}

export default toNative(MetadataFormStep)
</script>

<style lang="scss">
.metadata-form-step {
  .cz-group.my-5 {
    margin-top: 8px !important;
    margin-bottom: 8px !important;
  }
  .cz-group > .v-card-text {
    padding-top: 8px;
    padding-bottom: 4px;
  }
}
</style>
