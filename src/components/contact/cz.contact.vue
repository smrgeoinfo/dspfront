<template>
  <v-container class="cz-contact">
    <div class="text-h4">
      How to Contact Us
    </div>
    <v-divider class="mb-3" />

    <p class="text-subtitle-1">
      If you need help with data management or have questions about the guidance provided here, contact IEDA data via Email: <a href="mailto:info@iedadata.org">info@iedadata.org</a>
    </p>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue, toNative } from 'vue-facing-decorator'

@Component({
  name: 'cz-contact',
  components: { },
})
class CzContact extends Vue {

}
export default toNative(CzContact)
</script>

<style lang="scss" scoped>
</style>
