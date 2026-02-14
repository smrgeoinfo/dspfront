<template>
  <div class="cz-home">
    <v-parallax
      class="text-center"
      src="/img/bg-3.jpg"
      :height="isLoggedIn ? 300 : 400"
      :scale="1"
    >
      <v-container
        class="d-flex flex-column justify-center align-center full-height pa-12"
        :style="{
          'background-image':
            'linear-gradient(rgb(66 142 218 / 52%),rgb(0 0 0 / 38%))',
        }"
      >
        <div class="has-text-shadow">
          <div class="has-text-white text-h2 font-weight-bold">
            {{ $t("home.banner.title") }}
          </div>
        </div>
        <template v-if="!isLoggedIn">
          <div>
            <div class="has-text-white mt-4 mb-4 has-text-shadow text-h6">
              Ready to Submit Data?
            </div>
            <v-btn rounded @click="openLogInDialog()">
              Log In
            </v-btn>
          </div>
        </template>
      </v-container>
    </v-parallax>

    <section id="action-cards" class="text-center">
      <div class="mb-4 text-h4">
        What do you want to do?
      </div>
      <v-row justify="center">
        <v-col cols="12" md="6">
          <router-link to="/metadata/ada" class="action-link d-flex align-center pa-4 rounded">
            <v-icon class="action-icon flex-shrink-0 mr-4">mdi-flask-outline</v-icon>
            <div class="text-left">
              <div class="text-h6">{{ $t("home.actions.createMetadata.label") }}</div>
              <div class="font-weight-light text-subtitle-1">{{ $t("home.actions.createMetadata.description") }}</div>
            </div>
          </router-link>
        </v-col>

        <v-col cols="12" md="6">
          <router-link to="/submit" class="action-link d-flex align-center pa-4 rounded">
            <v-icon class="action-icon flex-shrink-0 mr-4">mdi-book-plus</v-icon>
            <div class="text-left">
              <div class="text-h6">{{ $t("home.actions.submitData.label") }}</div>
              <div class="font-weight-light text-subtitle-1">{{ $t("home.actions.submitData.description") }}</div>
            </div>
          </router-link>
        </v-col>

        <v-col cols="12" md="6">
          <router-link to="/resources/recommendations" class="action-link d-flex align-center pa-4 rounded">
            <v-icon class="action-icon flex-shrink-0 mr-4">mdi-arrow-decision</v-icon>
            <div class="text-left">
              <div class="text-h6">{{ $t("home.actions.findRepo.label") }}</div>
              <div class="font-weight-light text-subtitle-1">{{ $t("home.actions.findRepo.description") }}</div>
            </div>
          </router-link>
        </v-col>

        <v-col cols="12" md="6">
          <router-link to="/metadata/cdif" class="action-link d-flex align-center pa-4 rounded">
            <v-icon class="action-icon flex-shrink-0 mr-4">mdi-database-plus</v-icon>
            <div class="text-left">
              <div class="text-h6">{{ $t("home.actions.registerDataset.label") }}</div>
              <div class="font-weight-light text-subtitle-1">{{ $t("home.actions.registerDataset.description") }}</div>
            </div>
          </router-link>
        </v-col>

        <v-col cols="12" md="6">
          <a href="https://www.geosamples.org/" target="_blank" class="action-link d-flex align-center pa-4 rounded">
            <v-icon class="action-icon flex-shrink-0 mr-4">mdi-test-tube</v-icon>
            <div class="text-left">
              <div class="text-h6">{{ $t("home.actions.registerSamples.label") }}</div>
              <div class="font-weight-light text-subtitle-1">{{ $t("home.actions.registerSamples.description") }}</div>
            </div>
          </a>
        </v-col>
      </v-row>
    </section>

    <div class="text-center mb-2 mt-n2">
      <p class="font-weight-light text-subtitle-1">
        For complete instructions on using this site, see the
        <router-link to="/user-guide">User Guide</router-link>.
      </p>
    </div>

    <v-divider />

    <section class="d-flex align-center justify-center flex-column flex-lg-row">
      <div class="text-center text-lg-left">
        <div class="mb-4 text-h4">
          Make your Data FAIR
        </div>
        <p class="font-weight-light text-subtitle-1">
          This {{ $t("portalName") }} works with reputable Earth Science
          repositories to ensure that research products you submit are
          <u>F</u>indable, <u>A</u>ccessible, <u>I</u>nteroperable, and
          <u>R</u>eusable.
        </p>
      </div>

      <div class="mt-4 text-center text-sm-center text-right flex-shrink-0">
        <a
          href="https://www.go-fair.org/fair-principles/"
          class="d-block full-width"
          target="_blank"
          style="max-width: 100%"
        >
          <img
            src="/img/fair.png"
            alt="FAIR"
            style="max-width: 100%"
          >
        </a>
      </div>
    </section>

    <v-divider />

    <section>
      <div class="mb-2 text-center text-h4">
        Supported Repositories
      </div>
      <div class="d-flex justify-center mb-4">
        <p class="font-weight-light text-center text-subtitle-1">
          You can submit data to HydroShare and EarthChem directly through this Data Submission Portal.
          <br>Click the links below to learn more about HydroShare and EarthChem.
        </p>
      </div>
      <div class="repos mb-4 d-flex flex-wrap align-center justify-center">
        <a
          v-for="repo of supportedRepositories"
          :key="repo.key"
          :href="repo.url"
          :title="repo.name"
          target="_blank"
        ><img :src="repo.logoSrc" :alt="repo.name"></a>
      </div>
      <div class="d-flex justify-center mt-12">
        <p class="font-weight-light text-center text-subtitle-1">
          Metadata for samples can be submitted via SESAR. Click the link below to learn more about SESAR and sample registration or contact <a href="mailto:info@geosamples.org">info@geosamples.org</a> for more information.
        </p>
      </div>

      <div class="d-flex flex-wrap align-center justify-center mt-6">
        <a
          href="https://www.geosamples.org/"
          target="_blank"
          title="SESAR"
        ><img class="medium" src="/img/sesar.png" alt="SESAR logo"></a>
      </div>

      <div class="d-flex justify-center mt-12">
        <p class="font-weight-light text-center text-subtitle-1">
          You can also register datasets submitted to other repositories here so that they will be discoverable by Critical Zone Scientists. You can register data submitted to any repository, but the following are some common examples.
        </p>
      </div>

      <div class="repos my-4 d-flex flex-wrap align-center justify-center">
        <a
          v-for="repo of exampleExternalRepositories"
          :key="repo.key"
          :href="repo.url"
          :title="repo.name"
          target="_blank"
        ><img class="small" :src="repo.logoSrc" :alt="repo.name"></a>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import type {
  IRepository,
} from '~/components/submissions/types'
import { Component, toNative, Vue } from 'vue-facing-decorator'
import { useRouter } from 'vue-router'
import {
  EnumRepositoryKeys,
} from '~/components/submissions/types'
import { DISCOVERY_SITE_URL } from '~/constants'
import User from '~/models/user.model'
import { repoMetadata } from '../submit/constants'

@Component({
  name: 'cz-home',
  components: {},
})
class CzHome extends Vue {
  repoMetadata = repoMetadata
  discoverySiteUrl = DISCOVERY_SITE_URL
  router = useRouter()

  get isLoggedIn() {
    return User.$state.isLoggedIn
  }

  get supportedRepositories() {
    return Object.keys(repoMetadata)
      .map(key => repoMetadata[key])
      .filter(repo => !repo.isExternal && repo.isSupported?.form)
  }

  get exampleExternalRepositories(): Partial<IRepository>[] {
    return [
      repoMetadata[EnumRepositoryKeys.essDive],
      repoMetadata[EnumRepositoryKeys.edi],
      repoMetadata[EnumRepositoryKeys.zenodo],
      repoMetadata[EnumRepositoryKeys.scienceBase],
      repoMetadata[EnumRepositoryKeys.openTopography],
    ]
  }

  openLogInDialog() {
    User.openLogInDialog()
  }
}
export default toNative(CzHome)
</script>

<style lang="scss" scoped>
p {
  max-width: 70rem;
}

section {
  padding: 3rem;
}

:deep(.v-parallax__content) {
  padding: 0;
}

.v-icon {
  color: rgba(0, 0, 0, 0.54) !important;
}

#action-cards {
  .action-link {
    text-decoration: none;
    color: inherit;
    transition: background-color 0.2s ease;
    border: 1px solid rgba(0, 0, 0, 0.08);

    &:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }
  }

  .action-icon {
    font-size: 3rem;
    color: rgba(0, 0, 0, 0.54);
  }
}

.repos {
  gap: 2rem 4rem;

  a {
    max-width: 100%;

    img {
      max-height: 5rem;
      max-width: 100%;
    }
  }
}

img.small {
  max-height: 3rem;
  max-width: 100%;
}

img.medium {
  max-height: 6rem;
  max-width: 100%;
}
</style>
