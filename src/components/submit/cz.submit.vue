<template>
  <div class="cz-submit">
    <template v-if="isInSubmitLandingPage">
      <div
        class="banner text-center"
        :style="{
          'background-image':
            `linear-gradient(180deg, rgba(30, 36, 58, 0.35), rgba(28, 37, 65, 0.3)), url(${
              '/img/bg-1.jpg'
            })`,
        }"
      >
        <div>
          <div class="has-text-white text-h2 has-text-shadow">
            Submit Data
          </div>
          <div class="has-text-white mt-4 mb-2 text-h4 has-text-shadow">
            Not sure which repository to use?
          </div>
          <v-btn to="/resources/recommendations">
            Help Me Decide
          </v-btn>
        </div>
      </div>

      <v-container>
        <div class="text-h4 my-8 text-center">
          Repositories
        </div>

        <div class="mb-4">
          <div class="repositories justify-space-around px-4">
            <cz-repository-submit-card
              v-for="repo of supportedRepoMetadata"
              :key="repo.key"
              :repo="repo"
              @click.enter="submitTo(repo)"
            />

            <cz-repository-submit-card
              :repo="sesarCardMetadata"
              @click.="openSesar"
            >
              <template #description="{ desc }">
                <div class="text-subtitle-1 text-medium-emphasis">
                  <p>{{ desc }}</p>
                  <br>
                  <p>For instructions and best practices related to registering samples, visit our <a :href="guideUrls.main" target="_blank" @click.stop="">CZNet data best practices</a>.</p>
                </div>
              </template>
            </cz-repository-submit-card>

            <cz-repository-submit-card
              :repo="registerDatasetCardMetadata"
              @click.enter="goToRegisterDataset"
            />

            <cz-repository-submit-card
              :repo="updateMetadataCardMetadata"
              @click.enter="goToUpdateMetadata"
            />

            <cz-repository-submit-card
              :repo="bundleWizardCardMetadata"
              @click.enter="goToBundleWizard"
            />
          </div>
        </div>
      </v-container>

    </template>

    <template v-else>
      <router-view />
    </template>
  </div>
</template>

<script lang="ts">
import type { RouteLocationNormalized } from 'vue-router'
import { EnumRepositoryKeys, type IRepository } from '../submissions/types'
import { Notifications } from '@cznethub/cznet-vue-core'
import { Component, mixins, toNative } from 'vue-facing-decorator'
import { useRoute, useRouter } from 'vue-router'
import { repoMetadata } from '~/components/submit/constants'
import CzRepositorySubmitCard from '~/components/submit/cz.repository-submit-card.vue'
import { ActiveRepositoryMixin } from '~/mixins/activeRepository.mixin'
import User from '~/models/user.model'
import { guideUrls } from '../recommendations/constants'

@Component({
  name: 'cz-submit',
  components: { CzRepositorySubmitCard },
})
class CzSubmit extends mixins(ActiveRepositoryMixin) {

  route = useRoute()
  router = useRouter()
  guideUrls = guideUrls

  sesarCardMetadata = {
    ...repoMetadata[EnumRepositoryKeys.sesar],
    name: 'Register Samples',
  }

  registerDatasetCardMetadata: IRepository = {
    key: EnumRepositoryKeys.external,
    name: 'Register Dataset',
    logoSrc: '',
    description:
      'Register a dataset that has already been submitted to another repository. Creates a CDIF Discovery metadata record for discoverability.',
    isExternal: true,
    isSupported: { registration: false, form: true },
    submitTooltip: 'Register a dataset submitted to another repository.',
  }

  updateMetadataCardMetadata: IRepository = {
    key: EnumRepositoryKeys.external,
    name: 'Update Existing Metadata',
    logoSrc: '',
    description:
      'Fetch and update an existing metadata record by DOI, upload a JSON-LD file, or load metadata from a URL.',
    isExternal: true,
    isSupported: { registration: false, form: true },
    submitTooltip: 'Update an existing metadata record.',
  }

  bundleWizardCardMetadata: IRepository = {
    key: EnumRepositoryKeys.ada,
    name: 'ADA Bundle Wizard',
    logoSrc: '/img/ada.png',
    description:
      'Upload a data bundle (ZIP), introspect file contents, fill metadata forms driven by OGC Building Block profiles, and push metadata to ADA.',
    isExternal: true,
    isSupported: { registration: false, form: true },
    submitTooltip: 'Create metadata from an ADA data bundle.',
  }

  get repoCollection(): IRepository[] {
    return Object.keys(repoMetadata).map(r => repoMetadata[r])
  }

  get supportedRepoMetadata() {
    return this.repoCollection.filter(r => !r.isExternal && r.isSupported?.form)
  }

  get isInSubmitLandingPage() {
    return !(this.route as RouteLocationNormalized).params.repository
  }

  goToRegisterDataset() {
    this.router.push({ name: 'metadata-cdif' })
  }

  goToUpdateMetadata() {
    this.router.push({ name: 'update-metadata' })
  }

  goToBundleWizard() {
    this.router.push({ name: 'bundle-wizard' })
  }

  openSesar() {
    window.open(this.sesarCardMetadata.url, '_blank')
  }

  created() {
  }
}
export default toNative(CzSubmit)
</script>

<style lang="scss" scoped>
.repositories {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(30rem, 100%), 1fr));
  gap: 2rem;
}

.banner {
  padding: 4rem 2rem;
  background: var(--bg-light-gray);
  background-size: cover;
  background-repeat: no-repeat;
  padding-top: 9rem;
  padding-bottom: 9rem;
  margin-bottom: 2rem;
  min-height: 30rem;
  flex-direction: column;
}
</style>
