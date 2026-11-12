import { useStorage } from '@vueuse/core';

// Na primeira visita, o histórico já existente não conta como não lido
export const lastSeen = useStorage<number>('notif_last_seen', Date.now());