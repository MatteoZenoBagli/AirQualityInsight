<template>
  <div class="log-container">
    <div v-if="entries.length === 0" class="log-entry empty">
      No log entries to display
    </div>
    <div v-for="(entry, index) in entries" :key="index" class="log-entry">
      <div class="log-icon" :class="'log-' + entry.type">
        <i :class="getIconClass(entry.type)"></i>
      </div>
      <div class="log-content">
        <span class="log-timestamp">{{ entry.timestamp }}</span>
        <span class="log-message">{{ entry.message }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "LogComponent",
  props: {
    entries: {
      type: Array,
      default: () => [],
    },
  },
  methods: {
    getIconClass(type) {
      if ("info" === type) return "fas fa-info-circle";
      if ("warning" === type) return "fas fa-exclamation-triangle";
      if ("error" === type) return "fas fa-times-circle";
      return "fas fa-info-circle";
    },
  },
};
</script>

<style scoped lang="scss">
.log {
  &-container {
    height: 100%;
    overflow-y: auto;
  }

  &-entry {
    padding: 8px 0;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: flex-start;

    &.empty {
      color: #666;
      font-style: italic;
      padding: 15px 0;
      text-align: center;
      justify-content: center;
    }
  }

  &-icon {
    margin-right: 10px;
    width: 24px;
    text-align: center;
    padding-top: 2px;
  }

  &-content {
    flex: 1;
  }

  &-timestamp {
    font-weight: bold;
    margin-right: 8px;
  }

  &-info {
    color: #2196f3;
  }

  &-warning {
    color: #ff9800;
  }

  &-error {
    color: #f44336;
  }
}
</style>