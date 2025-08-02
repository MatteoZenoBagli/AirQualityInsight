<template>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key" :class="{
            'text-center': column.center,
            'sortable': column.sortable && false !== column.sortable,
            'sorted': sortConfig.key === column.key
          }" @click="handleSort(column)">
            <div class="th-content">
              <span>{{ column.label }}</span>
              <div v-if="column.sortable && false !== column.sortable" class="sort-indicators">
                <i class="fas fa-caret-up sort-arrow" :class="{
                  'active': sortConfig.key === column.key && sortConfig.direction === 'asc'
                }"></i>
                <i class="fas fa-caret-down sort-arrow" :class="{
                  'active': sortConfig.key === column.key && sortConfig.direction === 'desc'
                }"></i>
              </div>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in sortedData" :key="index" @click="$emit('row-click', row)" class="table-row">
          <td v-for="column in columns" :key="column.key" :class="{ 'text-center': column.center }">
            <span v-if="column.html" v-html="row[column.key]"></span>
            <span v-else>{{ row[column.key] }}</span>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="data.length === 0" class="no-data">No data to display</div>
  </div>
</template>

<script>
export default {
  name: "TableComponent",
  props: {
    data: {
      type: Array,
      default: () => [],
    },
    columns: {
      type: Array,
      default: () => [],
    },
    defaultSort: {
      type: Object,
      default: () => ({ key: null, direction: 'asc' })
    }
  },
  data() {
    return {
      sortConfig: {
        key: this.defaultSort.key,
        direction: this.defaultSort.direction
      }
    };
  },
  computed: {
    sortedData() {
      if (!this.sortConfig.key) {
        return this.data;
      }

      return [...this.data].sort((a, b) => {
        const aVal = a[this.sortConfig.key];
        const bVal = b[this.sortConfig.key];

        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return this.sortConfig.direction === 'asc' ? 1 : -1;
        if (bVal == null) return this.sortConfig.direction === 'asc' ? -1 : 1;

        // Determine sort type based on value
        const isNumeric = !isNaN(aVal) && !isNaN(bVal);
        const isDate = this.isDateString(aVal) && this.isDateString(bVal);

        let comparison = 0;

        if (isNumeric)
          comparison = parseFloat(aVal) - parseFloat(bVal);
        else if (isDate)
          comparison = new Date(aVal) - new Date(bVal);
        else {
          // String comparison (case-insensitive)
          const aStr = String(aVal).toLowerCase();
          const bStr = String(bVal).toLowerCase();
          comparison = aStr.localeCompare(bStr);
        }

        return this.sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
  },
  methods: {
    handleSort(column) {
      if (!column.sortable) return;
      if (false === column.sortable) return;

      if (this.sortConfig.key === column.key)
        this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
      else {
        // Set new column and default to ascending
        this.sortConfig.key = column.key;
        this.sortConfig.direction = 'asc';
      }

      // Emit sort event for parent component awareness
      this.$emit('sort-changed', {
        key: this.sortConfig.key,
        direction: this.sortConfig.direction
      });
    },

    isDateString(value) {
      // Simple date detection - you might want to customize this based on your date formats
      if (typeof value !== 'string') return false;

      // Check for common date patterns
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}/,                   // YYYY-MM-DD
        /^\d{2}\/\d{2}\/\d{4}/,                 // MM/DD/YYYY
        /^\d{2}-\d{2}-\d{4}/,                   // MM-DD-YYYY
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/  // ISO datetime
      ];

      return datePatterns.some(pattern => pattern.test(value)) && !isNaN(Date.parse(value));
    },
    setSort(key, direction = 'asc') {
      this.sortConfig.key = key;
      this.sortConfig.direction = direction;
    },
    clearSort() {
      this.sortConfig.key = null;
      this.sortConfig.direction = 'asc';
    }
  },

  watch: {
    defaultSort: {
      handler(newSort) {
        this.sortConfig.key = newSort.key;
        this.sortConfig.direction = newSort.direction;
      },
      deep: true
    }
  }
};
</script>

<style scoped lang="scss">
.table-wrapper {
  width: 100%;
  overflow-x: auto;
  height: 500px;

  .table-row {
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f5f5f5;
    }
  }
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #eee;

  &.text-center {
    text-align: center;
  }
}

th {
  position: sticky;
  top: 0;
  z-index: 1;
  border-bottom: 2px solid #dee2e6;
  background-color: #f9f9f9;
  font-weight: 600;
  user-select: none;

  &.sortable {
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #e9ecef;
    }
  }

  &.sorted {
    background-color: #e3f2fd;
  }

  .th-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .sort-indicators {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: -2px;
    min-width: 12px;

    .sort-arrow {
      font-size: 10px;
      color: #bbb;
      transition: color 0.2s;
      line-height: 1;

      &.active {
        color: #007bff;
      }
    }
  }

  &.text-center .th-content {
    justify-content: center;
  }
}

.no-data {
  padding: 20px;
  text-align: center;
  color: #666;
  font-style: italic;
}
</style>