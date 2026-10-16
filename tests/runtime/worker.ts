export { GroupSessionDO } from '@/durable-objects/group-session-do'

export default {
  fetch() {
    return new Response('Runtime tests only', { status: 404 })
  },
}
