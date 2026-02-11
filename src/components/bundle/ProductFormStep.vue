<template>
  <v-card flat>
    <v-card-title class="text-h6">
      Product Metadata
    </v-card-title>
    <v-card-subtitle>
      No product.yaml was found in your bundle. Please provide the product metadata below.
    </v-card-subtitle>
    <v-card-text>
      <v-text-field
        v-model="form.title"
        label="Title *"
        variant="outlined"
        density="compact"
        hint="Title of the data product"
        persistent-hint
        class="mb-3"
      />

      <v-textarea
        v-model="form.description"
        label="Description *"
        variant="outlined"
        density="compact"
        rows="3"
        hint="Brief description of the data product"
        persistent-hint
        class="mb-3"
      />

      <v-text-field
        v-model="form.keywords"
        label="Keywords"
        variant="outlined"
        density="compact"
        hint="Comma-separated keywords"
        persistent-hint
        class="mb-3"
      />

      <v-text-field
        v-model="form.license"
        label="License"
        variant="outlined"
        density="compact"
        hint="e.g. CC-BY-4.0"
        persistent-hint
        class="mb-3"
      />

      <div class="text-subtitle-2 mb-2">
        Creators
      </div>
      <div
        v-for="(creator, index) in form.creators"
        :key="index"
        class="d-flex align-center mb-2"
      >
        <v-text-field
          v-model="creator.name"
          :label="`Creator ${index + 1} name`"
          variant="outlined"
          density="compact"
          hide-details
          class="mr-2"
        />
        <v-text-field
          v-model="creator.orcid"
          label="ORCID (optional)"
          variant="outlined"
          density="compact"
          hide-details
          class="mr-2"
          style="max-width: 20rem"
        />
        <v-btn
          v-if="form.creators.length > 1"
          icon
          size="small"
          variant="text"
          @click="removeCreator(index)"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
      <v-btn variant="text" size="small" @click="addCreator">
        + Add Creator
      </v-btn>

      <div class="text-subtitle-2 mt-4 mb-2">
        Funding References (optional)
      </div>
      <div
        v-for="(fund, index) in form.fundingReferences"
        :key="'fund-' + index"
        class="d-flex align-center mb-2"
      >
        <v-text-field
          v-model="fund.funderName"
          label="Funder"
          variant="outlined"
          density="compact"
          hide-details
          class="mr-2"
        />
        <v-text-field
          v-model="fund.awardNumber"
          label="Award Number"
          variant="outlined"
          density="compact"
          hide-details
          class="mr-2"
          style="max-width: 12rem"
        />
        <v-btn
          icon
          size="small"
          variant="text"
          @click="removeFunding(index)"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
      <v-btn variant="text" size="small" @click="addFunding">
        + Add Funding
      </v-btn>
    </v-card-text>

    <v-card-actions>
      <v-btn variant="text" @click="$emit('back')">
        Back
      </v-btn>
      <v-spacer />
      <v-btn
        color="primary"
        variant="elevated"
        :disabled="!isFormValid"
        :loading="isSaving"
        @click="onSave"
      >
        Save Product Metadata
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { Component, Emit, Prop, toNative, Vue } from 'vue-facing-decorator'
import axios from 'axios'
import User from '~/models/user.model'

const ADA_BRIDGE_API = '/api/ada-bridge'

@Component({ name: 'product-form-step' })
class ProductFormStep extends Vue {
  @Prop({ required: true }) sessionId!: string

  isSaving = false

  form = {
    title: '',
    description: '',
    keywords: '',
    license: 'CC-BY-4.0',
    creators: [{ name: '', orcid: '' }] as { name: string; orcid: string }[],
    fundingReferences: [] as { funderName: string; awardNumber: string }[],
  }

  get isFormValid(): boolean {
    return !!(this.form.title.trim() && this.form.description.trim())
  }

  addCreator() {
    this.form.creators.push({ name: '', orcid: '' })
  }

  removeCreator(index: number) {
    this.form.creators.splice(index, 1)
  }

  addFunding() {
    this.form.fundingReferences.push({ funderName: '', awardNumber: '' })
  }

  removeFunding(index: number) {
    this.form.fundingReferences.splice(index, 1)
  }

  @Emit('saved')
  emitSaved(sessionData: any) {
    return sessionData
  }

  async onSave() {
    this.isSaving = true
    try {
      const productYaml = {
        title: this.form.title.trim(),
        description: this.form.description.trim(),
        keywords: this.form.keywords.split(',').map(k => k.trim()).filter(Boolean),
        license: this.form.license.trim(),
        creators: this.form.creators
          .filter(c => c.name.trim())
          .map(c => ({ name: c.name.trim(), orcid: c.orcid.trim() || undefined })),
        fundingReferences: this.form.fundingReferences
          .filter(f => f.funderName.trim())
          .map(f => ({ funderName: f.funderName.trim(), awardNumber: f.awardNumber.trim() || undefined })),
      }

      // Save product_yaml to session
      await axios.patch(`${ADA_BRIDGE_API}/bundle/${this.sessionId}/`, {
        product_yaml: productYaml,
      }, {
        params: { access_token: User.$state.orcidAccessToken },
      })

      // Re-run introspection with product metadata
      await axios.post(`${ADA_BRIDGE_API}/bundle/${this.sessionId}/introspect/`, {}, {
        params: { access_token: User.$state.orcidAccessToken },
      })

      // Fetch updated session
      const resp = await axios.get(`${ADA_BRIDGE_API}/bundle/${this.sessionId}/`, {
        params: { access_token: User.$state.orcidAccessToken },
      })

      this.emitSaved(resp.data)
    }
    catch (e: any) {
      console.error('Failed to save product metadata:', e)
    }
    finally {
      this.isSaving = false
    }
  }
}

export default toNative(ProductFormStep)
</script>
