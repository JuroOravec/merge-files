<template>
  <v-app>
    <v-main>
      <MergeFiles/>
    </v-main>
  </v-app>
</template>

<script>
import MergeFiles from './components/MergeFiles.vue'

export default {
  name: 'App',

  components: {
    MergeFiles,
  },

  data: () => ({
    //
  }),
}
</script>

<style lang="scss">
:root {
  // See https://stackoverflow.com/questions/46522331/scroll-bar-in-the-main-section-of-a-v-app
  overflow-y: auto !important;
}
</style>