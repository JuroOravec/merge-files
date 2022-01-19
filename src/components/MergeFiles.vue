<template>
  <div class="NotionTasksPanel pa-8">
    <div class="d-flex">
      <h1 class="text-h2 pb-8 font-weight-bold">Merge Files</h1>
    </div>

    <div class="text-body-1 pb-16">
      <p class="pb-4">
        Use this site to merge data files (JSON, CSV, ...) locally.
      </p>

      <ol class="pl-8">
        <li>
          Select which files should be merged.
        </li>
        <li>
          Define how the data should be extracted from each file.
        </li>
        <li>
          Define how the extracted data should be merged into a single file or text.
        </li>
        <li>
          (Optional): Define the file name.
        </li>
        <li>
          Click "Run Workflow". This should download the generated file.
        </li>
      </ol>
    </div>


    <h4 class="text-h5 pb-4">1. Select files to merge</h4>
    <v-file-input
      :model-value="files"
      placeholder="Upload your documents"
      label="File input"
      multiple
      chips
      counter
      prepend-inner-icon="mdi-paperclip"
      class="pb-8"
      @update:modelValue="(newFiles) => files = newFiles"
    />

    <h4 class="text-h5 pb-4">2. Extract data from files</h4>
    <CodeMirror
      v-model:value="extractScript"
      :options="codeMirrorOptions"
      border
      :placeholder="DEFAULT_EXTRACT_SCRIPT"
      class="mb-8"
    />

    <h4 class="text-h5 pb-4 pt-8">3. Merge extracted data</h4>
    <CodeMirror
      v-model:value="mergeScript"
      :options="codeMirrorOptions"
      border
      :placeholder="DEFAULT_MERGE_SCRIPT"
      class="mb-8"
    />

    <h4 class="text-h5 pt-8 pb-4">4. Exported file name</h4>
    <v-text-field
      v-model:value="exportFileName"
      placeholder="my_export"
      label="Exported file name"
      class="pb-8"
      @update:modelValue="(newName) => exportFileName = newName"
    />

    <div class="mt-4 mb-8">
      <v-btn
        :disabled="isRunButtonDisabled"
        color="primary"
        size="x-large"
        @click="runWorkflow"
      >
        Run Workflow
        <v-progress-circular
          v-if="isRunningWorkflow"
          indeterminate
          class="ml-2"
          size=20
          color="secondary"
        />
      </v-btn>
      <p v-if="!files.length" class="text-caption text-grey pt-2">
        You must first select files to merge!
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, Ref, watch, triggerRef } from 'vue'
import Papa from 'papaparse';
import CodeMirror from "codemirror-editor-vue3";
import codeMirror from "codemirror";
import "codemirror/mode/javascript/javascript.js";
import "codemirror/theme/mdn-like.css";

import { evalInContext } from '../utils/evalInContext';
import { downloadBlob } from '../utils/downloadBlob';

const codeMirrorOptions: codeMirror.EditorConfiguration = {
  ...codeMirror.defaults,
  mode: "text/javascript",
  theme: "mdn-like",
  lineNumbers: true,
  smartIndent: true,
  indentUnit: 2,
};

const DEFAULT_EXTRACT_SCRIPT = `/**
 * Extract data from a single file.
 *
 * @param {File} file - Input file. See https://developer.mozilla.org/en-US/docs/Web/API/File.
 * @param {number} index - 0-based position of the current input file.
 * @param {File[]} files  - Array of all input files.
 *
 * @returns {Any} - Data extracted from the file. Can be a promise.
 */
context.extract = async (file, index, files) => {
  // Assuming the file is a JSON
  const jsonText = await file.text();
  return JSON.parse(jsonText);
  // NOTE: To parse CSV, you can access papaparse in \`context.Papa\`. See https://www.papaparse.com/docs
};
`

const DEFAULT_MERGE_SCRIPT = `/**
 * Merge the extracted data into a single string /orBlob.
 *
 * @param {Object[]} data - List of data extracted in the extract script.
 * @param {File} data.file - File from which the data was extracted.
 * @param {Any} data.data - Data extracted from the file.
 *
 * @returns {Blob | string} - Either a Blob that can be downloaded or a string that will be converted to Blob.
 *                            Can be a promise.
 *                            See https://developer.mozilla.org/en-US/docs/Web/API/Blob
 */
context.merge = (dataArr) => {
  // Merge the data from different files into single object based on the file name
  const merged = {};
  dataArr.forEach((fileData) => {
    merged[fileData.file.name] = fileData.data;
  });
  return new Blob([JSON.stringify(merged, null, 2)], {type : 'application/json'});
  // NOTE: To construct CSV, you can access papaparse in \`context.Papa\`. See https://www.papaparse.com/docs
};
`

const scriptContext = {
  Papa,
};

const NotionTasksPanel = defineComponent({
  name: 'NotionTasksPanel',
  components: {
    CodeMirror,
  },
  setup() {
    const files: Ref<File[]> = ref([]);
    const extractScript: Ref<string> = ref(DEFAULT_EXTRACT_SCRIPT);
    const mergeScript: Ref<string> = ref(DEFAULT_MERGE_SCRIPT);
    const exportFileName: Ref<string> = ref('exported');
    const isRunningWorkflow: Ref<boolean> = ref(false);
    const runWorkflowError: Ref<Error | null> = ref(null);

    const runExtract = async (): Promise<{file: File; data: any}[]> => {
      const context = evalInContext(extractScript.value, {...scriptContext});
      const extractFn = context.extract as (file: File, index?: number, files?: File[]) => Promise<unknown>;
      const extractedData = await Promise.all(files.value.map(async (file, index, files) => {
        const data = await extractFn(file, index, files);
        return {
          file,
          data,
        };
      }));
      return extractedData;
    };

    const runMerge = async (data: unknown[]) => {
      const context = evalInContext(mergeScript.value, {...scriptContext});
      const mergeFn = context.merge as (data: unknown[]) => Promise<Blob | string>;
      const mergedData = await mergeFn(data);
      const blob = mergedData instanceof Blob ? mergedData : new Blob([mergedData], { type: 'text/plain' });
      return blob;
    };

    const runWorkflow = async (): Promise<void> => {
      if (isRunningWorkflow.value) return;
      isRunningWorkflow.value = true;
      runWorkflowError.value = null;

      try {
        const data = await runExtract();
        const mergedData = await runMerge(data);
        downloadBlob(mergedData, exportFileName.value);
      } catch (err) {
        console.error(err);
        runWorkflowError.value = err;
      }

      isRunningWorkflow.value = false;
    };

    const isRunButtonDisabled = computed((): boolean => isRunningWorkflow.value || !files.value.length);

    return {
      files,
      extractScript,
      mergeScript,
      exportFileName,
      isRunningWorkflow,
      runWorkflow,
      codeMirrorOptions,
      isRunButtonDisabled,
      DEFAULT_EXTRACT_SCRIPT,
      DEFAULT_MERGE_SCRIPT,
    };
  },
});

export default NotionTasksPanel;
</script>

<style lang="scss">
.NotionTasksPanel {
  .v-file-input {
    .v-chip {
      margin-left: 4px;
      margin-right: 4px;
    }
  }

  .CodeMirror-code {
    font-family: monospace !important;
    font-size: 1rem !important;
  }
}
</style>
