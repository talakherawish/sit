import { useStore } from './index'

// The prototype has no server, so the shared "world" (bookings, seats, visits, notices, reports and the
// simulated clock) lives in the browser. This keeps it in step across every open tab of the same browser,
// so a check-in on the staff dashboard shows up straight away in the renter app, and keeps it across
// reloads. Per-tab view state (who is logged in, language, open sheets) stays local to each tab.
const KEY = 'technopark-prototype-world'
const BUILD = import.meta.env.VITE_BUILD_ID

const read = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    return saved?.build === BUILD ? saved : null
  } catch {
    return null
  }
}

export function startSync() {
  let applying = false
  const apply = (w) => {
    applying = true
    useStore.setState({ data: w.data, now: w.now })
    applying = false
  }

  const saved = read()
  if (saved) apply(saved)

  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(KEY) : null
  if (channel) channel.onmessage = (e) => e.data?.build === BUILD && apply(e.data)
  else
    window.addEventListener('storage', (e) => {
      if (e.key !== KEY) return
      const w = read()
      if (w) apply(w)
    })

  let last = useStore.getState()
  useStore.subscribe((st) => {
    if (st.data === last.data && st.now === last.now) return
    last = st
    if (applying) return
    const world = { build: BUILD, data: st.data, now: st.now }
    try {
      localStorage.setItem(KEY, JSON.stringify(world))
    } catch {
      /* storage full or blocked: tabs still sync over the channel */
    }
    try {
      channel?.postMessage(world)
    } catch {
      /* ignore */
    }
  })
}
