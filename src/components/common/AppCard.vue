<template>
  <div class="app-card" :class="{ 'is-hoverable': hoverable, 'no-padding': noPadding }">
    <div v-if="$slots.header || title" class="card-header">
      <slot name="header">
        <div class="card-heading">
          <h3 class="card-title">{{ title }}</h3>
          <span v-if="subtitle" class="card-subtitle">{{ subtitle }}</span>
        </div>
      </slot>
    </div>
    <div class="card-body">
      <slot></slot>
    </div>
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  subtitle?: string;
  hoverable?: boolean;
  noPadding?: boolean;
}>();
</script>

<style scoped>
.app-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  transition: all var(--duration-fast) var(--ease-default);
}

.app-card.is-hoverable:hover {
  border-color: var(--surface-hover);
  box-shadow: var(--shadow-hover);
}

.card-header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--divider);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.card-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.card-subtitle {
  font-size: 0.78rem;
  color: var(--text-tertiary);
}

.card-body {
  padding: 16px 20px;
}

.app-card.no-padding .card-body {
  padding: 0;
}

.card-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--divider);
  background: var(--bg-subtle);
}
</style>
