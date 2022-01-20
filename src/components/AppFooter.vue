<template>
  <v-footer padless>
    <div class="justify-center d-flex text-body-2 text-center mx-auto">
      <p>
        Built with ❤️ by
        <a href="https://jurora.vc/" target="_blank" rel="noopener">
          Juro Oravec
        </a>
      </p>
      <div class="px-3">
        •
      </div>
      <p>
        <a href="https://github.com/JuroOravec/merge-files/issues/new" target="_blank" rel="noreferrer">
          Report an issue
        </a>
      </p>
    </div>
  </v-footer>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

const AppFooter = defineComponent({
  name: 'AppFooter',
  setup() {
    return {
    };
  },
});

export default AppFooter;
</script>
