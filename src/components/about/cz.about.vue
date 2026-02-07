<template>
  <v-container class="cz-about d-flex full-height pa-0">
    <div
      id="panel-left"
      class="flex-grow-1 hidden-sm-and-down"
      :style="{
        'background-image':
          `linear-gradient(rgb(0 52 82 / 31%), rgba(0, 0, 0, 0)), url(${
            '/img/bg-4.png'
          })`,
      }"
    />
    <v-container id="panel-right" class="pa-8">
      <div class="text-h4">
        About the {{ $t("home.banner.title") }}
      </div>
      <a :href="`${$t('footer.orgLink')}`" target="_blank">{{
        $t("footer.orgLink")
      }}</a>
      <v-divider class="mb-2" />
      <p class="text-body-1">
        {{ $t("about.body[0]") }}
      </p>
      <p class="text-body-1">
        {{ $t("about.body[1]") }}
      </p>

      <v-divider class="my-4" />

      <div class="text-h5 mb-2">
        {{ $t("home.submitData.title") }}
      </div>
      <p class="text-body-1">
        {{ $t("about.body[2]") }}
      </p>

      <v-list lines="two" class="mt-2">
        <v-list-item
          v-for="(feature, i) in 3"
          :key="i"
          :prepend-icon="'mdi-checkbox-marked-circle-outline'"
        >
          <v-list-item-title>{{ $t(`about.portalFeatures[${i}].title`) }}</v-list-item-title>
          <v-list-item-subtitle class="text-wrap">{{ $t(`about.portalFeatures[${i}].description`) }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </v-container>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue, toNative } from 'vue-facing-decorator'

@Component({
  name: 'cz-about',
  components: {},
})
class CzAbout extends Vue {}

export default toNative(CzAbout)
</script>

<style lang="scss" scoped>
#panel-left {
  background-size: cover;
  flex: 3;
}

#panel-left {
  padding-top: 8rem;
  background-size: cover;
}

#panel-right {
  flex: 1;
  flex-direction: column;
}
</style>
