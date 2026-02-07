<template>
  <v-container class="cz-ada-select-type py-8">
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

    <v-list
      class="profile-list mx-auto"
      lines="two"
    >
      <!-- General product (always first, unless filtered out) -->
      <v-list-item
        v-if="showGeneral"
        :key="generalProfile.key"
        :title="$t(`metadata.ada.profiles.${generalProfile.key}.name`)"
        :subtitle="$t(`metadata.ada.profiles.${generalProfile.key}.description`)"
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
          :title="$t(`metadata.ada.profiles.${profile.key}.name`)"
          :subtitle="$t(`metadata.ada.profiles.${profile.key}.description`)"
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

      <v-list-item v-if="!showGeneral && filteredMethods.length === 0">
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

@Component({
  name: 'cz-ada-select-type',
  components: {},
})
class CzAdaSelectType extends Vue {
  router = useRouter()
  search = ''

  generalProfile = { key: 'adaProduct' }

  methodProfiles = [
    { key: 'adaEMPA' },
    { key: 'adaICPMS' },
    { key: 'adaVNMIR' },
    { key: 'adaXRD' },
  ]

  matchesSearch(profileKey: string): boolean {
    if (!this.search) return true
    const q = this.search.toLowerCase()
    const name = (this.$t(`metadata.ada.profiles.${profileKey}.name`) as string).toLowerCase()
    const desc = (this.$t(`metadata.ada.profiles.${profileKey}.description`) as string).toLowerCase()
    return name.includes(q) || desc.includes(q)
  }

  get showGeneral(): boolean {
    return this.matchesSearch(this.generalProfile.key)
  }

  get filteredMethods() {
    return this.methodProfiles.filter(p => this.matchesSearch(p.key))
  }

  selectProfile(key: string) {
    this.router.push({ path: `/metadata/ada/${key}` })
  }
}

export default toNative(CzAdaSelectType)
</script>

<style lang="scss" scoped>
.cz-ada-select-type {
  max-width: 800px;
}

.profile-list {
  max-width: 50rem;
}
</style>
