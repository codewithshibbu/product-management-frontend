<script setup>
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Confirm' },
  message: { type: String, required: true },
  confirmLabel: { type: String, default: 'OK' },
  cancelLabel: { type: String, default: 'Cancel' },
  danger: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="confirm-backdrop"
      role="presentation"
      @click.self="emit('cancel')"
    >
      <div class="confirm-dialog" role="alertdialog" :aria-label="title">
        <h3 class="confirm-title">{{ title }}</h3>
        <p class="confirm-message">{{ message }}</p>
        <div class="confirm-actions">
          <button
            type="button"
            class="btn-cancel"
            :disabled="loading"
            @click="emit('cancel')"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="btn-ok"
            :class="{ danger }"
            :disabled="loading"
            @click="emit('confirm')"
          >
            {{ loading ? 'Please wait...' : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.45);
}

.confirm-dialog {
  width: min(400px, 100%);
  padding: 20px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.15);
}

.confirm-title {
  margin: 0 0 10px;
  font-size: 1.05rem;
  font-weight: 600;
  color: #222;
}

.confirm-message {
  margin: 0 0 18px;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #444;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel,
.btn-ok {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn-cancel {
  border: 1px solid #ccc;
  background: #fff;
  color: #333;
}

.btn-cancel:hover:not(:disabled) {
  background: #f4f5f7;
}

.btn-ok {
  border: 1px solid #2d5bff;
  background: #2d5bff;
  color: #fff;
}

.btn-ok.danger {
  border-color: #b42318;
  background: #b42318;
}

.btn-ok:hover:not(:disabled) {
  filter: brightness(1.05);
}

.btn-cancel:disabled,
.btn-ok:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
