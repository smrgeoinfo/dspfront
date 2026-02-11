<template>
  <v-container class="geodat-ada-select-type py-8">
    <div class="text-center mb-2">
      <div class="text-h4 mb-4">
        {{ $t("metadata.ada.title") }}
      </div>
      <p class="text-subtitle-1 font-weight-light mx-auto" style="max-width: 50rem">
        {{ $t("metadata.ada.description") }}
      </p>
    </div>

    <v-text-field
      v-model="search"
      prepend-inner-icon="mdi-magnify"
      label="Filter data types..."
      variant="outlined"
      density="compact"
      clearable
      hide-details
      class="mt-6 mb-4"
      style="max-width: 30rem; margin-inline: auto"
    />

    <div v-if="isLoading" class="d-flex justify-center mt-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-list
      v-else
      class="profile-list mx-auto"
      lines="two"
    >
      <!-- General product (always first, unless filtered out) -->
      <v-list-item
        v-if="showGeneral && generalProfile"
        :key="generalProfile.key"
        :title="getProfileName(generalProfile.key)"
        :subtitle="getProfileDescription(generalProfile.key)"
        @click="selectProfile(generalProfile.key)"
      >
        <template #prepend>
          <v-icon color="primary">
            mdi-flask-outline
          </v-icon>
        </template>
        <template #append>
          <v-icon size="small">
            mdi-chevron-right
          </v-icon>
        </template>
      </v-list-item>

      <!-- Divider with subheader -->
      <template v-if="filteredMethods.length > 0">
        <v-divider v-if="showGeneral" />
        <v-list-subheader>Analytical Method</v-list-subheader>

        <v-list-item
          v-for="profile in filteredMethods"
          :key="profile.key"
          :title="getProfileName(profile.key)"
          :subtitle="getProfileDescription(profile.key)"
          @click="selectProfile(profile.key)"
        >
          <template #prepend>
            <v-icon color="primary">
              mdi-flask-outline
            </v-icon>
          </template>
          <template #append>
            <v-icon size="small">
              mdi-chevron-right
            </v-icon>
          </template>
        </v-list-item>
      </template>

      <!-- CDIF Profiles section -->
      <template v-if="filteredCdifProfiles.length > 0">
        <v-divider v-if="showGeneral || filteredMethods.length > 0" />
        <v-list-subheader>CDIF Profiles</v-list-subheader>

        <v-list-item
          v-for="profile in filteredCdifProfiles"
          :key="profile.key"
          :title="getProfileName(profile.key)"
          :subtitle="getProfileDescription(profile.key)"
          @click="selectProfile(profile.key)"
        >
          <template #prepend>
            <v-icon color="teal">
              mdi-atom
            </v-icon>
          </template>
          <template #append>
            <v-icon size="small">
              mdi-chevron-right
            </v-icon>
          </template>
        </v-list-item>
      </template>

      <v-list-item v-if="!showGeneral && filteredMethods.length === 0 && filteredCdifProfiles.length === 0">
        <v-list-item-title class="text-body-2 text-medium-emphasis text-center">
          No matching data types
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-container>
</template>

<script lang="ts">
import { Component, toNative, Vue } from 'vue-facing-decorator'
import { useRouter } from 'vue-router'
import axios from 'axios'

@Component({
  name: 'geodat-ada-select-type',
  components: {},
})
class GeodatAdaSelectType extends Vue {
  router = useRouter()
  search = ''
  isLoading = false

  generalProfile: { key: string } | null = { key: 'adaProduct' }

  methodProfiles: { key: string }[] = []
  cdifProfiles: { key: string }[] = []

  async created() {
    this.isLoading = true
    try {
      const resp = await axios.get('/api/catalog/profiles/')
      const profiles = resp.data.results
      const general = profiles.find((p: any) => p.name === 'adaProduct')
      if (general) {
        this.generalProfile = { key: general.name }
      }
      this.methodProfiles = profiles
        .filter((p: any) => p.base_profile === 'adaProduct')
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
        .map((p: any) => ({ key: p.name }))
      this.cdifProfiles = profiles
        .filter((p: any) => p.name.startsWith('CDIF') && p.name !== 'CDIFDiscovery')
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
        .map((p: any) => ({ key: p.name }))
    }
    catch (e) {
      console.error('Failed to load profiles:', e)
      // Fall back to hardcoded profiles
      this.generalProfile = { key: 'adaProduct' }
      this.methodProfiles = [
        { key: 'adaEMPA' },
        { key: 'adaICPMS' },
        { key: 'adaVNMIR' },
        { key: 'adaXRD' },
      ]
      this.cdifProfiles = [
        { key: 'CDIFxas' },
      ]
    }
    finally {
      this.isLoading = false
    }
  }

  getProfileName(profileKey: string): string {
    const i18nKey = `metadata.ada.profiles.${profileKey}.name`
    const translated = this.$t(i18nKey) as string
    // If i18n returns the key itself, fall back to the profile key
    return translated !== i18nKey ? translated : profileKey
  }

  getProfileDescription(profileKey: string): string {
    const i18nKey = `metadata.ada.profiles.${profileKey}.description`
    const translated = this.$t(i18nKey) as string
    return translated !== i18nKey ? translated : ''
  }

  matchesSearch(profileKey: string): boolean {
    if (!this.search) return true
    const q = this.search.toLowerCase()
    const name = this.getProfileName(profileKey).toLowerCase()
    const desc = this.getProfileDescription(profileKey).toLowerCase()
    return name.includes(q) || desc.includes(q)
  }

  get showGeneral(): boolean {
    return !!this.generalProfile && this.matchesSearch(this.generalProfile.key)
  }

  get filteredMethods() {
    return this.methodProfiles.filter(p => this.matchesSearch(p.key))
  }

  get filteredCdifProfiles() {
    return this.cdifProfiles.filter(p => this.matchesSearch(p.key))
  }

  selectProfile(key: string) {
    this.router.push({ path: `/metadata/ada/${key}` })
  }
}

export default toNative(GeodatAdaSelectType)
</script>

<style lang="scss" scoped>
.geodat-ada-select-type {
  max-width: 800px;
}

.profile-list {
  max-width: 50rem;
}
</style>
