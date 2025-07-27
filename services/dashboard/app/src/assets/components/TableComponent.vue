<template>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key" :class="{ 'text-center': column.center }">
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in data" :key="index" @click="$emit('row-click', row)" class="table-row">
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
  },
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
}

.no-data {
  padding: 20px;
  text-align: center;
  color: #666;
  font-style: italic;
}
</style>